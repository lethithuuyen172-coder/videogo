export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export const ROUTES = [
  { href: "/chat", label: "AI对话" },
  { href: "/video", label: "AI视频" },
  { href: "/image", label: "AI图片" },
  { href: "/canvas", label: "画布" },
  { href: "/tools", label: "工具箱" },
  { href: "/assets", label: "资产" },
  { href: "/discover", label: "发现" },
  { href: "/credits", label: "积分" },
  { href: "/admin", label: "管理后台" },
] as const;

export const FILE_LIMITS = {
  imageBytes: 20 * 1024 * 1024,
  videoBytes: 200 * 1024 * 1024,
};
