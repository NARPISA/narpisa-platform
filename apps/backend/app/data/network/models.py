from pydantic import BaseModel, Field


class NetworkRefreshResponse(BaseModel):
    profile_id: str
    embedded: bool
    content_hash: str | None = None
    edges_computed: int = 0


class NetworkRebuildResponse(BaseModel):
    embedded_profiles: int = 0
    edges_computed: int = 0
    clusters_computed: int = 0


class NetworkGraphNode(BaseModel):
    id: str
    label: str
    headline: str = ""
    company: str = ""
    role_category: str = ""
    bio: str = ""
    linkedin_url: str = ""
    cluster_id: str | None = None
    cluster_label: str | None = None
    disciplines: list[str] = Field(default_factory=list)
    regions: list[str] = Field(default_factory=list)
    commodities: list[str] = Field(default_factory=list)
    countries: list[str] = Field(default_factory=list)
    sites: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class NetworkGraphEdge(BaseModel):
    id: str
    source: str
    target: str
    score: float
    semantic_score: float
    structured_score: float
    reasons: list[str] = Field(default_factory=list)


class NetworkGraphResponse(BaseModel):
    nodes: list[NetworkGraphNode]
    edges: list[NetworkGraphEdge]
    viewer_profile_id: str | None = None
