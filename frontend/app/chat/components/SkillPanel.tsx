"use client";

const skills = ["general", "video", "image", "script", "analysis"];

export function SkillPanel({ skill, setSkill }: { skill: string; setSkill: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      {skills.map((item) => (
        <button
          key={item}
          className={`rounded-md border border-line px-3 py-2 text-left text-sm ${skill === item ? "bg-accent text-white" : "bg-white"}`}
          onClick={() => setSkill(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
