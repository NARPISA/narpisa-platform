"use client";

import LinkedInIcon from "@mui/icons-material/LinkedIn";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import * as React from "react";
import type Sigma from "sigma";

import { getPdfWorkerUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export type NetworkGraphNode = {
  id: string;
  label: string;
  headline: string;
  company: string;
  role_category: string;
  bio: string;
  linkedin_url: string;
  cluster_id: string | null;
  cluster_label: string | null;
  disciplines: string[];
  regions: string[];
  commodities: string[];
  countries: string[];
  sites: string[];
  tags: string[];
};

export type NetworkGraphEdge = {
  id: string;
  source: string;
  target: string;
  score: number;
  semantic_score: number;
  structured_score: number;
  reasons: string[];
};

export type NetworkGraphData = {
  nodes: NetworkGraphNode[];
  edges: NetworkGraphEdge[];
  viewer_profile_id: string | null;
};

const emptyFilters = {
  query: "",
  tag: "",
  cluster: "",
  role: "",
  company: "",
};

const emptyGraph: NetworkGraphData = {
  nodes: [],
  edges: [],
  viewer_profile_id: null,
};
type GroupMode = "computed" | "region" | "commodity" | "industry";
type Recommendation = {
  score: number;
  semanticScore: number;
  structuredScore: number;
  reasons: string[];
};

const GROUP_MODES: Array<{ value: GroupMode; label: string }> = [
  { value: "computed", label: "Computed clusters" },
  { value: "region", label: "Region" },
  { value: "commodity", label: "Commodity" },
  { value: "industry", label: "Role / industry" },
];

export default function NetworkView() {
  const supabase = React.useMemo(() => createClient(), []);
  const [graph, setGraph] = React.useState<NetworkGraphData>(emptyGraph);
  const [isLoadingGraph, setIsLoadingGraph] = React.useState(true);
  const [graphError, setGraphError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState(emptyFilters);
  const [groupMode, setGroupMode] = React.useState<GroupMode>("computed");

  React.useEffect(() => {
    let active = true;

    async function loadGraph() {
      setIsLoadingGraph(true);
      setGraphError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        if (active) {
          setGraph(emptyGraph);
          setIsLoadingGraph(false);
        }
        return;
      }

      try {
        const response = await fetch(`${getPdfWorkerUrl()}/api/v1/network/graph`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error("Could not load network graph.");
        }
        const nextGraph = (await response.json()) as NetworkGraphData;
        if (active) {
          setGraph(nextGraph);
        }
      } catch {
        if (active) {
          setGraph(emptyGraph);
          setGraphError(
            "The recommendation graph is still loading or temporarily unavailable.",
          );
        }
      } finally {
        if (active) {
          setIsLoadingGraph(false);
        }
      }
    }

    void loadGraph();
    return () => {
      active = false;
    };
  }, [supabase]);

  const filteredNodes = React.useMemo(
    () => graph.nodes.filter((node) => matchesFilters(node, filters)),
    [graph.nodes, filters],
  );
  const visibleNodeIds = React.useMemo(
    () => new Set(filteredNodes.map((node) => node.id)),
    [filteredNodes],
  );
  const filteredEdges = React.useMemo(
    () =>
      graph.edges.filter(
        (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
      ),
    [graph.edges, visibleNodeIds],
  );
  const recommendationsByNodeId = React.useMemo(
    () => buildRecommendations(graph.edges, graph.viewer_profile_id),
    [graph.edges, graph.viewer_profile_id],
  );
  const recommendedNodes = React.useMemo(
    () =>
      filteredNodes
        .filter((node) => recommendationsByNodeId.has(node.id))
        .sort(
          (a, b) =>
            (recommendationsByNodeId.get(b.id)?.score ?? 0) -
            (recommendationsByNodeId.get(a.id)?.score ?? 0),
        ),
    [filteredNodes, recommendationsByNodeId],
  );

  return (
    <Stack spacing={3}>
      <Stack spacing={1.25}>
        <Typography
          component="h1"
          sx={{
            color: "secondary.main",
            fontSize: { xs: "3.2rem", md: "4.8rem" },
            fontWeight: 800,
            letterSpacing: "-0.04em",
          }}
        >
          Mining Network
        </Typography>
        <Typography sx={{ maxWidth: 820, fontSize: "1.45rem", color: "text.secondary" }}>
          Discover opted-in NaRPISA members by semantic profile similarity,
          mining tags, companies, and roles.
        </Typography>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          border: "1px solid rgba(83,132,180,0.18)",
          borderRadius: 2,
        }}
      >
        <Stack spacing={1.5}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "2fr repeat(3, 1fr)" },
              gap: 1.25,
            }}
          >
            <FilterField
              label="Search"
              value={filters.query}
              onChange={(query) => setFilters((current) => ({ ...current, query }))}
            />
            <FilterField
              label="Tag"
              value={filters.tag}
              onChange={(tag) => setFilters((current) => ({ ...current, tag }))}
            />
            <FilterField
              label="Cluster"
              value={filters.cluster}
              onChange={(cluster) =>
                setFilters((current) => ({ ...current, cluster }))
              }
            />
            <Button
              variant="outlined"
              onClick={() => setFilters(emptyFilters)}
              sx={{ minHeight: 54 }}
            >
              Clear filters
            </Button>
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              gap: 1.25,
            }}
          >
            <FilterField
              label="Role"
              value={filters.role}
              onChange={(role) => setFilters((current) => ({ ...current, role }))}
            />
            <FilterField
              label="Company"
              value={filters.company}
              onChange={(company) =>
                setFilters((current) => ({ ...current, company }))
              }
            />
          </Box>
          <Stack spacing={1}>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 800 }}>
              Color graph by
            </Typography>
            <ButtonGroup variant="outlined" sx={{ flexWrap: "wrap" }}>
              {GROUP_MODES.map((mode) => (
                <Button
                  key={mode.value}
                  variant={groupMode === mode.value ? "contained" : "outlined"}
                  onClick={() => setGroupMode(mode.value)}
                  sx={{ textTransform: "none" }}
                >
                  {mode.label}
                </Button>
              ))}
            </ButtonGroup>
          </Stack>
        </Stack>
      </Paper>

      {graphError ? <Alert severity="warning">{graphError}</Alert> : null}

      {!isLoadingGraph && graph.nodes.length === 0 ? (
        <Alert severity="info">
          No backend graph data is available yet. Add your mining network details
          on the profile page, then save to generate recommendations.
        </Alert>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.1fr) minmax(360px, 0.9fr)" },
          gap: 3,
          alignItems: "start",
        }}
      >
        {isLoadingGraph ? (
          <GraphLoadingSkeleton />
        ) : (
          <SigmaNetworkGraph
            nodes={filteredNodes}
            edges={filteredEdges}
            groupMode={groupMode}
          />
        )}
        <Stack spacing={1.5}>
          {recommendedNodes.length > 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                border: "1px solid rgba(175,84,40,0.22)",
                borderRadius: 2,
                bgcolor: "rgba(175,84,40,0.045)",
              }}
            >
              <Stack spacing={1.25}>
                <Box>
                  <Typography sx={{ fontSize: "1.2rem", fontWeight: 800 }}>
                    Recommended for you
                  </Typography>
                  <Typography sx={{ fontSize: "0.9rem", color: "text.secondary" }}>
                    Ranked from your profile&apos;s direct recommendation edges.
                    Embedding similarity is the OpenAI semantic match before
                    structured mining tags are added.
                  </Typography>
                </Box>
                {recommendedNodes.slice(0, 5).map((node) => (
                  <MemberCard
                    key={node.id}
                    node={node}
                    recommendation={recommendationsByNodeId.get(node.id)}
                  />
                ))}
              </Stack>
            </Paper>
          ) : null}
          <Typography sx={{ fontSize: "1.2rem", fontWeight: 800 }}>
            {filteredNodes.length} visible member{filteredNodes.length === 1 ? "" : "s"}
          </Typography>
          {isLoadingGraph
            ? Array.from({ length: 4 }).map((_, index) => (
                <MemberCardSkeleton key={index} />
              ))
            : filteredNodes.map((node) => (
                <MemberCard
                  key={node.id}
                  node={node}
                  isViewer={node.id === graph.viewer_profile_id}
                  recommendation={recommendationsByNodeId.get(node.id)}
                />
              ))}
        </Stack>
      </Box>
    </Stack>
  );
}

function GraphLoadingSkeleton() {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.5 },
        border: "1px solid rgba(83,132,180,0.18)",
        borderRadius: 2,
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      <Stack spacing={1.5}>
        <Box>
          <Skeleton variant="text" width={220} height={30} />
          <Skeleton variant="text" width="70%" height={22} />
        </Box>
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: { xs: 360, md: 520 },
            borderRadius: 2,
            bgcolor: "secondary.50",
            border: "1px solid rgba(83,132,180,0.12)",
            overflow: "hidden",
          }}
        >
          {[
            { left: "18%", top: "24%" },
            { left: "48%", top: "18%" },
            { left: "70%", top: "35%" },
            { left: "30%", top: "58%" },
            { left: "62%", top: "68%" },
          ].map((position, index) => (
            <Skeleton
              key={index}
              variant="circular"
              width={54}
              height={54}
              sx={{
                position: "absolute",
                left: position.left,
                top: position.top,
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
          <Skeleton
            variant="rounded"
            width="64%"
            height={3}
            sx={{ position: "absolute", left: "18%", top: "35%", opacity: 0.45 }}
          />
          <Skeleton
            variant="rounded"
            width="50%"
            height={3}
            sx={{ position: "absolute", left: "30%", top: "61%", opacity: 0.45 }}
          />
        </Box>
      </Stack>
    </Paper>
  );
}

function MemberCardSkeleton() {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: "1px solid rgba(83,132,180,0.18)",
        borderRadius: 2,
      }}
    >
      <Stack spacing={1.25}>
        <Skeleton variant="text" width="55%" height={28} />
        <Skeleton variant="text" width="80%" height={22} />
        <Stack direction="row" spacing={0.75}>
          <Skeleton variant="rounded" width={72} height={24} />
          <Skeleton variant="rounded" width={90} height={24} />
          <Skeleton variant="rounded" width={64} height={24} />
        </Stack>
      </Stack>
    </Paper>
  );
}

function FilterField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      fullWidth
      sx={{
        "& .MuiInputBase-input": { fontSize: "0.95rem" },
        "& .MuiInputLabel-root": { fontSize: "0.95rem" },
      }}
    />
  );
}

function SigmaNetworkGraph({
  nodes,
  edges,
  groupMode,
}: {
  nodes: NetworkGraphNode[];
  edges: NetworkGraphEdge[];
  groupMode: GroupMode;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const groupLabels = React.useMemo(
    () => Array.from(new Set(nodes.map((node) => groupValue(node, groupMode)))),
    [groupMode, nodes],
  );

  React.useEffect(() => {
    let renderer: Sigma | null = null;
    let isCancelled = false;

    if (!containerRef.current) {
      return undefined;
    }

    const sigmaGraph = new Graph();
    nodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / Math.max(nodes.length, 1);
      sigmaGraph.addNode(node.id, {
        label: node.label,
        x: Math.cos(angle),
        y: Math.sin(angle),
        size: 8 + Math.min(8, node.tags.length),
        color: colorForGroup(groupValue(node, groupMode)),
      });
    });

    edges.forEach((edge) => {
      if (sigmaGraph.hasNode(edge.source) && sigmaGraph.hasNode(edge.target)) {
        sigmaGraph.addEdgeWithKey(edge.id, edge.source, edge.target, {
          size: 1 + edge.score * 4,
          color: "rgba(83,132,180,0.42)",
          label: edge.reasons.slice(0, 2).join("; "),
        });
      }
    });

    if (nodes.length > 2 && edges.length > 0) {
      forceAtlas2.assign(sigmaGraph, {
        iterations: 80,
        settings: { gravity: 1, scalingRatio: 8 },
      });
    }

    void import("sigma").then(({ default: Sigma }) => {
      if (!containerRef.current || isCancelled) {
        return;
      }

      renderer = new Sigma(sigmaGraph, containerRef.current, {
        renderEdgeLabels: false,
        allowInvalidContainer: true,
        defaultEdgeType: "line",
      });
      renderer.on("clickNode", ({ node }) => setSelectedNodeId(node));
      requestAnimationFrame(() => {
        renderer?.getCamera().animatedReset({ duration: 350 });
      });
    });

    return () => {
      isCancelled = true;
      renderer?.kill();
    };
  }, [edges, groupMode, nodes]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.5 },
        border: "1px solid rgba(83,132,180,0.18)",
        borderRadius: 2,
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      <Stack spacing={1.5}>
        <Box>
          <Typography sx={{ fontSize: "1.2rem", fontWeight: 800 }}>
            Recommendation graph
          </Typography>
          <Typography sx={{ fontSize: "0.9rem", color: "text.secondary" }}>
            Click a node for profile details. Edge strength combines semantic
            similarity with structured mining tags. Colors show{" "}
            {GROUP_MODES.find((mode) => mode.value === groupMode)?.label.toLowerCase()}.
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            {groupLabels.slice(0, 8).map((label) => (
              <Chip
                key={label}
                label={label}
                size="small"
                sx={{
                  borderRadius: 1,
                  bgcolor: colorForGroup(label),
                  color: "common.white",
                  fontWeight: 700,
                }}
              />
            ))}
          </Stack>
        </Box>

        <Box
          ref={containerRef}
          sx={{
            width: "100%",
            height: { xs: 360, md: 520 },
            borderRadius: 2,
            bgcolor: "secondary.50",
            border: "1px solid rgba(83,132,180,0.12)",
          }}
        />
        {selectedNode ? <MemberCard node={selectedNode} compact /> : null}
      </Stack>
    </Paper>
  );
}

function MemberCard({
  node,
  compact = false,
  isViewer = false,
  recommendation,
}: {
  node: NetworkGraphNode;
  compact?: boolean;
  isViewer?: boolean;
  recommendation?: Recommendation;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: "1px solid rgba(83,132,180,0.18)",
        borderRadius: 2,
      }}
    >
      <Stack spacing={1.25}>
        <Box>
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
            <Typography sx={{ fontSize: "1.15rem", fontWeight: 800 }}>
              {node.label}
            </Typography>
            {isViewer ? (
              <Chip label="You" size="small" sx={{ borderRadius: 1, fontWeight: 700 }} />
            ) : null}
            {recommendation ? (
              <Chip
                label={`${Math.round(recommendation.score * 100)}% match`}
                size="small"
                sx={{
                  borderRadius: 1,
                  bgcolor: "secondary.main",
                  color: "common.white",
                  fontWeight: 700,
                }}
              />
            ) : null}
          </Stack>
          <Typography sx={{ fontSize: "0.95rem", color: "text.secondary" }}>
            {[node.headline, node.company, node.role_category]
              .filter(Boolean)
              .join(" | ") || "Mining network member"}
          </Typography>
          {node.cluster_label ? (
            <Typography sx={{ fontSize: "0.82rem", color: "secondary.main", mt: 0.5 }}>
              Cluster: {node.cluster_label}
            </Typography>
          ) : null}
        </Box>
        {node.bio && !compact ? (
          <Typography sx={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
            {node.bio}
          </Typography>
        ) : null}
        {recommendation ? (
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Chip
              label={`Embedding ${Math.round(recommendation.semanticScore * 100)}%`}
              size="small"
              sx={{ borderRadius: 1 }}
            />
            <Chip
              label={`Tags ${Math.round(recommendation.structuredScore * 100)}%`}
              size="small"
              sx={{ borderRadius: 1 }}
            />
            {recommendation.reasons.slice(0, 2).map((reason) => (
              <Chip key={reason} label={reason} size="small" sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        ) : null}
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {node.tags.slice(0, compact ? 6 : 10).map((tag) => (
            <Chip key={tag} label={tag} size="small" sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
        {node.linkedin_url ? (
          <Link
            href={node.linkedin_url}
            target="_blank"
            rel="noreferrer"
            underline="hover"
            sx={{
              display: "inline-flex",
              gap: 0.75,
              alignItems: "center",
              fontWeight: 700,
              fontSize: "0.9rem",
            }}
          >
            <LinkedInIcon fontSize="small" />
            LinkedIn profile
          </Link>
        ) : null}
      </Stack>
    </Paper>
  );
}

function matchesFilters(node: NetworkGraphNode, filters: typeof emptyFilters) {
  const haystack = [
    node.label,
    node.headline,
    node.company,
    node.role_category,
    node.bio,
    node.cluster_label ?? "",
    ...node.tags,
  ]
    .join(" ")
    .toLowerCase();

  return (
    includes(haystack, filters.query) &&
    includes(node.tags.join(" "), filters.tag) &&
    includes(node.cluster_label ?? "", filters.cluster) &&
    includes(node.role_category, filters.role) &&
    includes(node.company, filters.company)
  );
}

function buildRecommendations(
  edges: NetworkGraphEdge[],
  viewerProfileId: string | null,
) {
  if (!viewerProfileId) {
    return new Map<string, Recommendation>();
  }

  const recommendations = new Map<string, Recommendation>();
  edges.forEach((edge) => {
    const recommendedNodeId =
      edge.source === viewerProfileId
        ? edge.target
        : edge.target === viewerProfileId
          ? edge.source
          : null;
    if (!recommendedNodeId) {
      return;
    }
    recommendations.set(recommendedNodeId, {
      score: edge.score,
      semanticScore: edge.semantic_score,
      structuredScore: edge.structured_score,
      reasons: edge.reasons,
    });
  });

  return recommendations;
}

function includes(value: string, filter: string) {
  return !filter.trim() || value.toLowerCase().includes(filter.trim().toLowerCase());
}

function groupValue(node: NetworkGraphNode, groupMode: GroupMode) {
  if (groupMode === "region") {
    return (node.regions ?? [])[0] ?? "No region";
  }
  if (groupMode === "commodity") {
    return (node.commodities ?? [])[0] ?? "No commodity";
  }
  if (groupMode === "industry") {
    return node.role_category || "No role";
  }
  return node.cluster_label ?? node.cluster_id ?? "No cluster";
}

function colorForGroup(value: string | null) {
  if (!value) {
    return "#5384B4";
  }
  const colors = ["#5384B4", "#AF5428", "#7E9F3A", "#8E5AA8", "#C48A2C", "#3E7C84"];
  return colors[Math.abs(hashString(value)) % colors.length];
}

function hashString(value: string) {
  return value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}
