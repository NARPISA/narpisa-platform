from __future__ import annotations

from collections import Counter, defaultdict, deque
from dataclasses import dataclass
from hashlib import sha256
from typing import Any, cast

import httpx
from fastapi import HTTPException, status
from postgrest.exceptions import APIError
from supabase import Client, create_client
from supabase_auth.errors import AuthApiError

from app.core.config import Settings
from app.data.network.models import (
    NetworkGraphEdge,
    NetworkGraphNode,
    NetworkGraphResponse,
)

EMBEDDING_DIMENSIONS = 1536
OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings"
MIN_SEMANTIC_SIMILARITY = 0.55
MAX_MATCHES_PER_PROFILE = 18


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: str | None
    is_admin: bool


@dataclass(frozen=True)
class EmbeddedProfile:
    profile_id: str
    content_hash: str | None
    embedded: bool


def create_service_client(settings: Settings) -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def extract_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return authorization.split(" ", 1)[1].strip()


def first_row(rows: Any) -> dict[str, Any] | None:
    return rows[0] if isinstance(rows, list) and rows else None


def is_missing_network_graph_schema(exc: APIError) -> bool:
    message = str(getattr(exc, "message", exc))
    return (
        "network_profile_embeddings" in message
        or "network_edges" in message
        or "network_clusters" in message
        or "schema cache" in message
    )


def require_user_from_token(settings: Settings, token: str) -> AuthenticatedUser:
    supabase = create_service_client(settings)
    try:
        user_response = supabase.auth.get_user(token)
    except AuthApiError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        ) from exc

    user = user_response.user if user_response else None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    profile_response = (
        supabase.table("profiles")
        .select("id,tier:tiers(name)")
        .eq("id", user.id)
        .limit(1)
        .execute()
    )
    profile = first_row(profile_response.data)
    tier = profile.get("tier") if profile else None
    tier_name = tier.get("name") if isinstance(tier, dict) else None
    return AuthenticatedUser(
        id=str(user.id),
        email=user.email,
        is_admin=str(tier_name).lower() == "admin",
    )


async def embed_profile(
    settings: Settings,
    profile_id: str,
    *,
    force: bool = False,
) -> EmbeddedProfile:
    supabase = create_service_client(settings)
    profile = load_profile_payload(supabase, profile_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Network profile not found.",
        )
    if not profile.get("is_visible"):
        delete_profile_graph_rows(supabase, profile_id)
        return EmbeddedProfile(
            profile_id=profile_id,
            content_hash=None,
            embedded=False,
        )

    profile_text = build_profile_text(profile)
    content_hash = sha256(profile_text.encode("utf-8")).hexdigest()
    try:
        existing = (
            supabase.table("network_profile_embeddings")
            .select("content_hash")
            .eq("profile_id", profile_id)
            .limit(1)
            .execute()
        )
    except APIError as exc:
        if is_missing_network_graph_schema(exc):
            return EmbeddedProfile(
                profile_id=profile_id,
                content_hash=None,
                embedded=False,
            )
        raise
    existing_hash = first_row(existing.data)
    if (
        not force
        and existing_hash
        and existing_hash.get("content_hash") == content_hash
    ):
        return EmbeddedProfile(
            profile_id=profile_id,
            content_hash=content_hash,
            embedded=False,
        )

    embedding = await create_openai_embedding(settings, profile_text)
    vector = vector_literal(embedding)
    try:
        supabase.table("network_profile_embeddings").upsert(
            {
                "profile_id": profile_id,
                "profile_text": profile_text,
                "content_hash": content_hash,
                "embedding": vector,
                "model": settings.openai_embedding_model,
                "dimensions": EMBEDDING_DIMENSIONS,
            },
            on_conflict="profile_id",
        ).execute()
    except APIError as exc:
        if is_missing_network_graph_schema(exc):
            return EmbeddedProfile(
                profile_id=profile_id,
                content_hash=content_hash,
                embedded=False,
            )
        raise

    return EmbeddedProfile(
        profile_id=profile_id,
        content_hash=content_hash,
        embedded=True,
    )


async def rebuild_embeddings(settings: Settings, *, force: bool = False) -> int:
    supabase = create_service_client(settings)
    profiles = (
        supabase.table("network_profiles")
        .select("profile_id")
        .eq("is_visible", True)
        .execute()
    )
    embedded_count = 0
    for row in cast(list[dict[str, Any]], profiles.data or []):
        result = await embed_profile(settings, str(row["profile_id"]), force=force)
        if result.embedded:
            embedded_count += 1
    return embedded_count


async def create_openai_embedding(settings: Settings, text: str) -> list[float]:
    if not settings.open_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPEN_API_KEY is not configured on the backend.",
        )

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            OPENAI_EMBEDDINGS_URL,
            headers={"Authorization": f"Bearer {settings.open_api_key}"},
            json={
                "model": settings.openai_embedding_model,
                "input": text,
                "dimensions": EMBEDDING_DIMENSIONS,
            },
        )
    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI embedding request failed.",
        )
    payload = response.json()
    values = payload.get("data", [{}])[0].get("embedding")
    if not isinstance(values, list) or len(values) != EMBEDDING_DIMENSIONS:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI returned an invalid embedding.",
        )
    return [float(value) for value in values]


def load_profile_payload(supabase: Client, profile_id: str) -> dict[str, Any] | None:
    profile_response = (
        supabase.table("network_profiles")
        .select(
            "profile_id,is_visible,headline,company,role_category,disciplines,"
            "regions,bio,linkedin_url"
        )
        .eq("profile_id", profile_id)
        .limit(1)
        .execute()
    )
    profile = first_row(profile_response.data)
    if profile is None:
        return None

    account_response = (
        supabase.table("profile_social_accounts")
        .select("provider")
        .eq("profile_id", profile_id)
        .eq("provider", "linkedin")
        .limit(1)
        .execute()
    )
    interests_response = (
        supabase.table("network_interests")
        .select(
            "interest_type,label,"
            "commodity:commodities(name),country:countries(name),site:sites(name)"
        )
        .eq("profile_id", profile_id)
        .execute()
    )
    person_response = (
        supabase.table("profiles")
        .select("firstname,lastname,linkedin_url")
        .eq("id", profile_id)
        .limit(1)
        .execute()
    )

    profile["interests"] = interests_response.data or []
    profile["person"] = first_row(person_response.data) or {}
    profile["linkedin_verified"] = first_row(account_response.data) is not None
    return profile


def build_profile_text(profile: dict[str, Any]) -> str:
    raw_person = profile.get("person")
    person = cast(dict[str, Any], raw_person) if isinstance(raw_person, dict) else {}
    interests = cast(list[dict[str, Any]], profile.get("interests") or [])
    interest_labels = defaultdict(list)
    for interest in interests:
        label = str(interest.get("label") or "").strip()
        if label:
            interest_type = str(interest.get("interest_type") or "interest")
            interest_labels[interest_type].append(label)

    display_name = " ".join(
        value for value in [person.get("firstname"), person.get("lastname")] if value
    )

    lines = [
        f"Name: {display_name}",
        f"Headline: {profile.get('headline') or ''}",
        f"Company: {profile.get('company') or ''}",
        f"Role category: {profile.get('role_category') or ''}",
        f"Disciplines: {', '.join(profile.get('disciplines') or [])}",
        f"Regions: {', '.join(profile.get('regions') or [])}",
        f"Commodities: {', '.join(interest_labels.get('commodity', []))}",
        f"Countries: {', '.join(interest_labels.get('country', []))}",
        f"Sites: {', '.join(interest_labels.get('site', []))}",
        f"Bio: {profile.get('bio') or ''}",
        f"LinkedIn verified: {bool(profile.get('linkedin_verified'))}",
    ]
    return "\n".join(line for line in lines if line.split(":", 1)[1].strip())


def vector_literal(values: list[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in values) + "]"


def delete_profile_graph_rows(supabase: Client, profile_id: str) -> None:
    supabase.table("network_profile_embeddings").delete().eq(
        "profile_id", profile_id
    ).execute()
    supabase.table("network_edges").delete().or_(
        f"source_profile_id.eq.{profile_id},target_profile_id.eq.{profile_id}"
    ).execute()
    supabase.table("network_clusters").delete().eq("profile_id", profile_id).execute()


def rebuild_graph(settings: Settings) -> tuple[int, int]:
    supabase = create_service_client(settings)
    visible_profiles = load_visible_profiles(supabase)
    try:
        embeddings = load_embeddings(supabase)
    except APIError as exc:
        if is_missing_network_graph_schema(exc):
            return 0, 0
        raise
    edges = build_hybrid_edges(supabase, visible_profiles, embeddings)

    try:
        supabase.table("network_edges").delete().neq("score", -1).execute()
    except APIError as exc:
        if is_missing_network_graph_schema(exc):
            return 0, 0
        raise
    if edges:
        supabase.table("network_edges").insert(edges).execute()

    clusters = build_clusters(visible_profiles, edges)
    supabase.table("network_clusters").delete().neq("cluster_id", "__never__").execute()
    if clusters:
        supabase.table("network_clusters").insert(clusters).execute()

    return len(edges), len(clusters)


def load_visible_profiles(supabase: Client) -> dict[str, dict[str, Any]]:
    profiles_response = (
        supabase.table("network_profiles")
        .select(
            "profile_id,headline,company,role_category,disciplines,regions,bio,"
            "linkedin_url"
        )
        .eq("is_visible", True)
        .execute()
    )
    profiles = {
        str(row["profile_id"]): row
        for row in cast(list[dict[str, Any]], profiles_response.data or [])
    }

    if not profiles:
        return {}

    profile_ids = list(profiles)
    interests_response = (
        supabase.table("network_interests")
        .select(
            "profile_id,interest_type,label,"
            "commodity:commodities(name),country:countries(name),site:sites(name)"
        )
        .in_("profile_id", profile_ids)
        .execute()
    )
    for row in cast(list[dict[str, Any]], interests_response.data or []):
        profile = profiles.get(str(row["profile_id"]))
        if profile is not None:
            profile.setdefault("interests", []).append(row)

    person_response = (
        supabase.table("profiles")
        .select("id,firstname,lastname,linkedin_url")
        .in_("id", profile_ids)
        .execute()
    )
    for row in cast(list[dict[str, Any]], person_response.data or []):
        profile = profiles.get(str(row["id"]))
        if profile is not None:
            profile["person"] = row

    return profiles


def load_embeddings(supabase: Client) -> set[str]:
    response = (
        supabase.table("network_profile_embeddings").select("profile_id").execute()
    )
    return {
        str(row["profile_id"])
        for row in cast(list[dict[str, Any]], response.data or [])
    }


def build_hybrid_edges(
    supabase: Client,
    profiles: dict[str, dict[str, Any]],
    embedded_profile_ids: set[str],
) -> list[dict[str, Any]]:
    edges_by_pair: dict[tuple[str, str], dict[str, Any]] = {}
    for profile_id in embedded_profile_ids:
        if profile_id not in profiles:
            continue
        embedding_response = (
            supabase.table("network_profile_embeddings")
            .select("embedding")
            .eq("profile_id", profile_id)
            .limit(1)
            .execute()
        )
        embedding_row = first_row(embedding_response.data)
        if embedding_row is None:
            continue
        matches = supabase.rpc(
            "match_network_profile_embeddings",
            {
                "query_embedding": embedding_row["embedding"],
                "excluded_profile_id": profile_id,
                "match_count": MAX_MATCHES_PER_PROFILE,
                "min_similarity": MIN_SEMANTIC_SIMILARITY,
            },
        ).execute()
        for match in cast(list[dict[str, Any]], matches.data or []):
            other_id = str(match["profile_id"])
            if other_id not in profiles:
                continue
            pair = ordered_pair(profile_id, other_id)
            semantic_score = float(match["similarity"])
            structured_score, reasons = structured_similarity(
                profiles[profile_id], profiles[other_id]
            )
            score = min(1.0, semantic_score * 0.7 + structured_score * 0.3)
            existing = edges_by_pair.get(pair)
            if existing and float(existing["score"]) >= score:
                continue
            edges_by_pair[pair] = {
                "source_profile_id": pair[0],
                "target_profile_id": pair[1],
                "score": round(score, 4),
                "semantic_score": round(semantic_score, 4),
                "structured_score": round(structured_score, 4),
                "reasons": reasons or ["Semantic profile similarity"],
                "edge_type": "hybrid" if reasons else "semantic",
            }
    return list(edges_by_pair.values())


def structured_similarity(
    a: dict[str, Any],
    b: dict[str, Any],
) -> tuple[float, list[str]]:
    reasons: list[str] = []
    score = 0.0
    if same_text(a.get("company"), b.get("company")):
        score += 0.25
        reasons.append(f"Same company: {a.get('company')}")
    if same_text(a.get("role_category"), b.get("role_category")):
        score += 0.08
        reasons.append(f"Similar role: {a.get('role_category')}")

    for label, weight, a_values, b_values in [
        ("discipline", 0.08, a.get("disciplines") or [], b.get("disciplines") or []),
        ("region", 0.07, a.get("regions") or [], b.get("regions") or []),
        ("commodity", 0.1, interests(a, "commodity"), interests(b, "commodity")),
        ("country", 0.08, interests(a, "country"), interests(b, "country")),
        ("site", 0.16, interests(a, "site"), interests(b, "site")),
    ]:
        shared = shared_values(a_values, b_values)
        if shared:
            score += min(0.35, weight * len(shared))
            reasons.append(f"Shared {label}: {', '.join(shared[:3])}")

    return min(1.0, score), reasons


def interests(profile: dict[str, Any], interest_type: str) -> list[str]:
    rows = cast(list[dict[str, Any]], profile.get("interests") or [])
    return [
        interest_label(row, interest_type)
        for row in rows
        if row.get("interest_type") == interest_type
        and interest_label(row, interest_type)
    ]


def interest_label(row: dict[str, Any], interest_type: str) -> str:
    relation_key = {
        "commodity": "commodity",
        "country": "country",
        "site": "site",
    }.get(interest_type)
    relation = row.get(relation_key) if relation_key else None
    if isinstance(relation, dict):
        related_name = str(relation.get("name") or "").strip()
        if related_name:
            return related_name
    return str(row.get("label") or "").strip()


def shared_values(a: list[str], b: list[str]) -> list[str]:
    b_lookup = {value.lower(): value for value in b}
    return [value for value in a if value.lower() in b_lookup]


def same_text(a: Any, b: Any) -> bool:
    return bool(str(a or "").strip()) and (
        str(a).strip().lower() == str(b).strip().lower()
    )


def ordered_pair(a: str, b: str) -> tuple[str, str]:
    return (a, b) if a < b else (b, a)


def build_clusters(
    profiles: dict[str, dict[str, Any]],
    edges: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    adjacency: dict[str, set[str]] = {profile_id: set() for profile_id in profiles}
    for edge in edges:
        source = str(edge["source_profile_id"])
        target = str(edge["target_profile_id"])
        adjacency.setdefault(source, set()).add(target)
        adjacency.setdefault(target, set()).add(source)

    visited: set[str] = set()
    clusters: list[dict[str, Any]] = []
    cluster_index = 0
    for profile_id in profiles:
        if profile_id in visited:
            continue
        cluster_index += 1
        component = connected_component(profile_id, adjacency, visited)
        label = cluster_label([profiles[item] for item in component])
        cluster_id = f"cluster-{cluster_index}"
        for member_id in component:
            clusters.append(
                {
                    "profile_id": member_id,
                    "cluster_id": cluster_id,
                    "cluster_label": label,
                    "confidence": 1,
                }
            )
    return clusters


def connected_component(
    start: str,
    adjacency: dict[str, set[str]],
    visited: set[str],
) -> list[str]:
    queue: deque[str] = deque([start])
    component: list[str] = []
    visited.add(start)
    while queue:
        current = queue.popleft()
        component.append(current)
        for neighbor in adjacency.get(current, set()):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return component


def cluster_label(profiles: list[dict[str, Any]]) -> str:
    labels: Counter[str] = Counter()
    for profile in profiles:
        labels.update(interests(profile, "commodity"))
        labels.update(profile.get("regions") or [])
        labels.update(profile.get("disciplines") or [])
        company = str(profile.get("company") or "").strip()
        if company:
            labels.update([company])
    if not labels:
        return "Mining Network"
    return " / ".join(label for label, _ in labels.most_common(2))


def load_graph(
    settings: Settings,
    viewer_profile_id: str | None = None,
) -> NetworkGraphResponse:
    supabase = create_service_client(settings)
    profiles = load_visible_profiles(supabase)
    try:
        clusters_response = supabase.table("network_clusters").select("*").execute()
    except APIError as exc:
        if is_missing_network_graph_schema(exc):
            return NetworkGraphResponse(
                nodes=[],
                edges=[],
                viewer_profile_id=viewer_profile_id,
            )
        raise
    clusters = {
        str(row["profile_id"]): row
        for row in cast(list[dict[str, Any]], clusters_response.data or [])
    }
    try:
        edges_response = (
            supabase.table("network_edges")
            .select("*")
            .order("score", desc=True)
            .limit(400)
            .execute()
        )
    except APIError as exc:
        if is_missing_network_graph_schema(exc):
            return NetworkGraphResponse(
                nodes=[],
                edges=[],
                viewer_profile_id=viewer_profile_id,
            )
        raise

    nodes = [
        graph_node(profile_id, profile, clusters.get(profile_id))
        for profile_id, profile in profiles.items()
    ]
    edges = [
        graph_edge(row)
        for row in cast(list[dict[str, Any]], edges_response.data or [])
        if str(row["source_profile_id"]) in profiles
        and str(row["target_profile_id"]) in profiles
    ]
    return NetworkGraphResponse(
        nodes=nodes,
        edges=edges,
        viewer_profile_id=viewer_profile_id,
    )


def graph_node(
    profile_id: str,
    profile: dict[str, Any],
    cluster: dict[str, Any] | None,
) -> NetworkGraphNode:
    raw_person = profile.get("person")
    person = cast(dict[str, Any], raw_person) if isinstance(raw_person, dict) else {}
    label = " ".join(
        value for value in [person.get("firstname"), person.get("lastname")] if value
    )
    disciplines = list(profile.get("disciplines") or [])
    regions = list(profile.get("regions") or [])
    commodities = interests(profile, "commodity")
    countries = interests(profile, "country")
    sites = interests(profile, "site")
    tags = [
        *disciplines,
        *regions,
        *commodities,
        *countries,
        *sites,
    ]
    return NetworkGraphNode(
        id=profile_id,
        label=label or "Network member",
        headline=str(profile.get("headline") or ""),
        company=str(profile.get("company") or ""),
        role_category=str(profile.get("role_category") or ""),
        bio=str(profile.get("bio") or ""),
        linkedin_url=str(
            profile.get("linkedin_url") or person.get("linkedin_url") or ""
        ),
        cluster_id=str(cluster.get("cluster_id")) if cluster else None,
        cluster_label=str(cluster.get("cluster_label")) if cluster else None,
        disciplines=disciplines,
        regions=regions,
        commodities=commodities,
        countries=countries,
        sites=sites,
        tags=list(dict.fromkeys(tags)),
    )


def graph_edge(row: dict[str, Any]) -> NetworkGraphEdge:
    reasons = row.get("reasons")
    return NetworkGraphEdge(
        id=f"{row['source_profile_id']}-{row['target_profile_id']}",
        source=str(row["source_profile_id"]),
        target=str(row["target_profile_id"]),
        score=float(row.get("score") or 0),
        semantic_score=float(row.get("semantic_score") or 0),
        structured_score=float(row.get("structured_score") or 0),
        reasons=(
            [str(reason) for reason in reasons] if isinstance(reasons, list) else []
        ),
    )
