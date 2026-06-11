"""Built-in shoppable-video script skill catalog.

The source material is the 108-file Douyin/TikTok prompt pack stored outside the
repo. This module keeps the app self-contained by preserving the catalog,
category mapping, and a deterministic generator for production-ready prompts.
"""

from dataclasses import dataclass
from typing import Literal

from app.models.generation import ScriptGenerateReq

Platform = Literal["tiktok", "douyin"]


@dataclass(frozen=True)
class ScriptSkillTemplate:
    key: str
    platform: Platform
    source_id: int
    name: str
    category: str
    archetype: str


TIKTOK_NAMES = {
    1: "女主播",
    2: "街头采访",
    3: "沉浸式教程解说",
    4: "前后对比脚本",
    5: "开箱测评",
    6: "剧情短剧",
    7: "对比实测",
    8: "极致冲突",
    9: "用户证言",
    10: "评论区回复",
    11: "短剧脚本（海外适用）",
    12: "多使用场景",
    13: "商场优化版",
    14: "即梦口播自己分析场景",
    15: "女主播在车上",
    16: "VEO一段式8秒健身房口播",
    17: "电商标题搜索优化师",
    18: "海外男装搭配",
    19: "顶级复刻",
    20: "海外宫廷剧剧情",
    21: "海外工厂外贸",
    22: "痛点前置+拆箱评测+促销口播",
    23: "产品防止变形（通用）",
    24: "全类目（通用）",
    25: "超市哄抢",
    26: "超市飞奔哄抢",
    27: "仓库主理人",
    28: "GPT故事板分镜图",
    29: "疯抢优化版",
    30: "九宫格TikTok原生感分镜带货",
    31: "零售专家",
    32: "男装带货1",
    33: "男装带货2",
    34: "男装带货3",
    35: "男装带货4",
    36: "男装带货5",
    37: "女装博主带货",
    38: "女装服饰店拍摄",
    39: "品牌主理人",
    40: "擅长制造高反差UGC视频",
    41: "探店博主",
    42: "痛点脚本",
    43: "宫播TikTok原生感分镜带货",
    44: "痛点救场GPT生故事编排表图",
    45: "剧情发展型UGC种草口播解说广告",
    46: "痛点救场型BeforeAfter15s50sUGC",
    47: "POV真实感ASMR疯抢促销口播",
    48: "产品角度9宫格图",
    49: "真实替换模特图",
    50: "产品正侧视图",
    51: "产品白底图",
    52: "全品类GPT故事编排表",
    53: "POV感官动作驱动型",
    54: "真实AI模特换装",
}

CATEGORY_BY_ID = {
    **dict.fromkeys([6, 11, 41, 42, 44, 45, 46, 47, 53, 54], "剧情/故事类"),
    **dict.fromkeys([3, 14, 15, 16, 19], "视频/AI生成类"),
    **dict.fromkeys([28, 30, 43, 48, 49, 50, 51, 52], "批量/制片类"),
    **dict.fromkeys([1, 2, 4, 5, 7, 8, 9, 10, 12, 13], "人设/口播类"),
    **dict.fromkeys([17, 18, 31, 32, 33, 34, 35, 36, 37, 38, 39], "电商/服装类"),
    **dict.fromkeys([20, 21, 22, 23, 24, 25, 26, 27, 29, 40], "场景/剧情类"),
}

ARCHETYPE_BY_CATEGORY = {
    "剧情/故事类": "Hook -> 痛点冲突 -> 产品救场 -> 证明 -> CTA",
    "视频/AI生成类": "产品锁定 -> 场景分析 -> 镜头复刻 -> AI视频提示词",
    "批量/制片类": "产品身份卡 -> 方向规划 -> 8格分镜 -> Prompt矩阵",
    "人设/口播类": "达人身份 -> 真实口播 -> 轻演示 -> 评论互动",
    "电商/服装类": "搜索卖点 -> 搭配/测评 -> 信任证明 -> 下单理由",
    "场景/剧情类": "强场景 -> 视觉反差 -> 群体反馈 -> 促销闭环",
}


def list_script_templates() -> list[dict]:
    return [template_to_dict(item) for item in SCRIPT_SKILL_TEMPLATES]


def template_to_dict(template: ScriptSkillTemplate) -> dict:
    return {
        "key": template.key,
        "platform": template.platform,
        "source_id": template.source_id,
        "name": template.name,
        "category": template.category,
        "archetype": template.archetype,
    }


def get_script_template(template_key: str | None, platform: Platform) -> ScriptSkillTemplate:
    if template_key:
        for item in SCRIPT_SKILL_TEMPLATES:
            if item.key == template_key:
                return item
    fallback_id = 82 if platform == "douyin" else 28
    return next(item for item in SCRIPT_SKILL_TEMPLATES if item.source_id == fallback_id)


def build_shoppable_video_script(req: ScriptGenerateReq) -> dict:
    template = get_script_template(req.template_key, req.platform)
    market = req.target_market or ("全国通投" if req.platform == "douyin" else "US")
    audience = req.target_audience or ("25-40岁短视频购物用户" if req.platform == "douyin" else "25-40 year-old TikTok shoppers")
    style = req.style_preference or ("UGC原生真实感" if req.platform == "douyin" else "native UGC")
    points = req.selling_points[:3] or ["高颜值外观", "使用门槛低", "适合短视频展示"]
    cta = req.call_to_action or ("左下角小黄车领券" if req.platform == "douyin" else "Tap the link to shop")
    duration = req.duration_seconds
    opening = "2.7秒留人" if req.platform == "douyin" else "3秒停划"
    platform_name = "抖音" if req.platform == "douyin" else "TikTok"

    storyboard = _build_storyboard(req, template, market, audience, style, points, cta)
    video_prompt = _build_video_prompt(req, template, market, audience, style, points, cta, storyboard)
    return {
        "framework": template.archetype,
        "platform": req.platform,
        "platform_name": platform_name,
        "template": template_to_dict(template),
        "duration_seconds": duration,
        "language": req.language,
        "target_market": market,
        "target_audience": audience,
        "style_preference": style,
        "selling_points": points,
        "hook_rule": opening,
        "script": storyboard,
        "video_prompt": video_prompt,
    }


def _build_storyboard(
    req: ScriptGenerateReq,
    template: ScriptSkillTemplate,
    market: str,
    audience: str,
    style: str,
    points: list[str],
    cta: str,
) -> list[dict]:
    product = req.product_name
    scenario = req.product_scenario or _default_scenario(template.platform, template.category)
    hook = _hook(template.platform, product, points[0])
    subtitle_label = "口播字幕" if template.platform == "douyin" else "Local subtitle"
    return [
        {
            "shot": "01",
            "time": "0-2s",
            "goal": "Hook停划",
            "visual": f"{scenario}里，目标用户突然遇到一个高频痛点，镜头快速推近{product}相关问题。",
            "camera": "手持特写 / handheld close-up",
            subtitle_label: hook,
        },
        {
            "shot": "02",
            "time": "2-4s",
            "goal": "痛点放大",
            "visual": f"展示没有{product}时的麻烦状态，用真实生活细节制造共鸣。",
            "camera": "中景切特写 / medium to close-up",
            subtitle_label: "以前每次都卡在这一步，真的很影响体验。",
        },
        {
            "shot": "03",
            "time": "4-6s",
            "goal": "产品登场",
            "visual": f"{product}从画面侧边自然出现，保持产品颜色、外形、配件一致，手部操作清晰。",
            "camera": "俯拍 / top-down",
            subtitle_label: f"后来我换成这款{product}。",
        },
        {
            "shot": "04",
            "time": "6-8s",
            "goal": "卖点证明1",
            "visual": f"用一次连续动作证明卖点：{points[0]}，避免夸大效果。",
            "camera": "微距功能演示 / macro demo",
            subtitle_label: f"重点是{points[0]}，上手很直观。",
        },
        {
            "shot": "05",
            "time": "8-10s",
            "goal": "卖点证明2",
            "visual": f"切到第二个使用细节，突出{points[1] if len(points) > 1 else points[0]}。",
            "camera": "POV第一视角 / POV",
            subtitle_label: "这个细节对我来说很加分。",
        },
        {
            "shot": "06",
            "time": "10-12s",
            "goal": "多场景扩展",
            "visual": f"快速三连切：{market}用户在不同生活场景使用{product}，强化复用价值。",
            "camera": "快切组接 / fast montage",
            subtitle_label: "不止一个场景能用，日常频率挺高。",
        },
        {
            "shot": "07",
            "time": "12-14s",
            "goal": "信任与互动",
            "visual": f"{audience}露出真实反馈表情，旁边出现评论区提问或朋友认可。",
            "camera": "人物反应中景 / reaction medium shot",
            subtitle_label: _interaction(template.platform),
        },
        {
            "shot": "08",
            "time": "14-15s",
            "goal": "CTA转化",
            "visual": "产品完整陈列，包装、配件、核心使用画面同时出现，画面底部出现行动指令。",
            "camera": "英雄收尾 / hero shot",
            subtitle_label: cta,
        },
    ]


def _build_video_prompt(
    req: ScriptGenerateReq,
    template: ScriptSkillTemplate,
    market: str,
    audience: str,
    style: str,
    points: list[str],
    cta: str,
    storyboard: list[dict],
) -> str:
    product = req.product_name
    platform_name = "Douyin" if template.platform == "douyin" else "TikTok"
    shot_lines = "\n".join(
        f"{item['shot']} {item['time']}: {item['visual']} CAMERA: {item['camera']}"
        for item in storyboard
    )
    return (
        f"Create a {req.duration_seconds}s vertical 9:16 {platform_name} shoppable UGC video for {product}.\n"
        f"Use the script skill template: {template.source_id}. {template.name} ({template.category}).\n"
        f"Target market: {market}. Target audience: {audience}. Style: {style}.\n"
        f"Core selling points: {', '.join(points)}.\n"
        "Product lock: keep product color, shape, logo, scale, accessories and material consistent in every shot. "
        "Do not invent unsupported functions or exaggerated claims.\n"
        f"Storyboard:\n{shot_lines}\n"
        f"CTA: {cta}.\n"
        "Visual style: real handheld phone footage, natural lighting, native social-commerce pacing, readable subtitles, "
        "clear product close-ups, no studio-perfect stock look, no unsafe usage, no empty poster layout."
    )


def _default_scenario(platform: Platform, category: str) -> str:
    if category == "电商/服装类":
        return "试衣镜前/衣帽间" if platform == "douyin" else "bedroom mirror setup"
    if category == "批量/制片类":
        return "家庭客厅的商业分镜制片场景" if platform == "douyin" else "home production storyboard setup"
    if category == "场景/剧情类":
        return "商超/仓库/家庭多场景" if platform == "douyin" else "store, warehouse and home scenes"
    return "真实家庭生活场景" if platform == "douyin" else "real everyday home scene"


def _hook(platform: Platform, product: str, first_point: str) -> str:
    if platform == "douyin":
        return f"家人们，{product}这个{first_point}的细节，我真没想到这么顺手。"
    return f"I didn't expect this {product} detail to make such a difference: {first_point}."


def _interaction(platform: Platform) -> str:
    if platform == "douyin":
        return "评论区说说你是不是也遇到过这个问题。"
    return "Would you use this every day? Tell me in the comments."


SCRIPT_SKILL_TEMPLATES = [
    ScriptSkillTemplate(
        key=f"tiktok-{source_id:02d}",
        platform="tiktok",
        source_id=source_id,
        name=name,
        category=CATEGORY_BY_ID[source_id],
        archetype=ARCHETYPE_BY_CATEGORY[CATEGORY_BY_ID[source_id]],
    )
    for source_id, name in TIKTOK_NAMES.items()
] + [
    ScriptSkillTemplate(
        key=f"douyin-{source_id + 54:03d}",
        platform="douyin",
        source_id=source_id + 54,
        name=f"抖音{name}" if not name.startswith("抖音") else name,
        category=CATEGORY_BY_ID[source_id],
        archetype=ARCHETYPE_BY_CATEGORY[CATEGORY_BY_ID[source_id]],
    )
    for source_id, name in TIKTOK_NAMES.items()
]
