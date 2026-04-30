from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.core.config import Settings, get_settings
from app.data.network.models import (
    NetworkGraphResponse,
    NetworkRebuildResponse,
    NetworkRefreshResponse,
)
from app.data.network.services import (
    embed_profile,
    extract_bearer_token,
    load_graph,
    rebuild_embeddings,
    rebuild_graph,
    require_user_from_token,
)

router = APIRouter(prefix="/network", tags=["network"])


@router.get("/graph", response_model=NetworkGraphResponse)
async def get_network_graph(
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> NetworkGraphResponse:
    user = require_user_from_token(settings, extract_bearer_token(authorization))
    return load_graph(settings, viewer_profile_id=user.id)


@router.post("/profiles/{profile_id}/refresh", response_model=NetworkRefreshResponse)
async def refresh_network_profile(
    profile_id: str,
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> NetworkRefreshResponse:
    user = require_user_from_token(settings, extract_bearer_token(authorization))
    if user.id != profile_id and not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only refresh your own network profile.",
        )

    embedded = await embed_profile(settings, profile_id)
    edges_computed, _clusters_computed = rebuild_graph(settings)
    return NetworkRefreshResponse(
        profile_id=profile_id,
        embedded=embedded.embedded,
        content_hash=embedded.content_hash,
        edges_computed=edges_computed,
    )


@router.post("/rebuild", response_model=NetworkRebuildResponse)
async def rebuild_network(
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> NetworkRebuildResponse:
    user = require_user_from_token(settings, extract_bearer_token(authorization))
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )

    embedded_profiles = await rebuild_embeddings(settings, force=False)
    edges_computed, clusters_computed = rebuild_graph(settings)
    return NetworkRebuildResponse(
        embedded_profiles=embedded_profiles,
        edges_computed=edges_computed,
        clusters_computed=clusters_computed,
    )
