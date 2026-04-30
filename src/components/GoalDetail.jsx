import { useEffect, useMemo, useRef, useState } from "react";
import ProgressHeader from "./ProgressHeader";
import SubtaskList from "./SubtaskList";
import { DEFAULT_CATEGORY_ID } from "../utils/storage";

const CATEGORY_EMOJI_OPTIONS = [
  { emoji: "🌱", label: "새싹", color: "#8BCB6A" },
  { emoji: "🧹", label: "청소", color: "#FFEBA3" },
  { emoji: "💼", label: "일", color: "#A78BFA" },
  { emoji: "💚", label: "건강", color: "#7FCB77" },
  { emoji: "⭐", label: "취미", color: "#FFD166" },
  { emoji: "🏃", label: "운동", color: "#7FB3FF" },
  { emoji: "📚", label: "공부", color: "#B8A6F5" },
  { emoji: "☀️", label: "루틴", color: "#FFCF70" },
  { emoji: "🎨", label: "창작", color: "#FFB3A7" },
  { emoji: "🧘", label: "휴식", color: "#8FD7C3" },
];

const SOFT_FALLBACK_COLOR = "#8BCB6A";

function calcTaskProgress(task) {
  if (!Array.isArray(task.subtasks) || task.subtasks.length === 0) {
    return task.done ? 100 : 0;
  }

  const done = task.subtasks.filter((s) => s.done).length;
  return Math.round((done / task.subtasks.length) * 100);
}

function calcProgress(goal) {
  const total = goal.tasks.length;
  if (total === 0) return 0;

  const sum = goal.tasks.reduce((acc, task) => acc + calcTaskProgress(task), 0);
  return Math.round(sum / total);
}

function getCategory(categories, categoryId) {
  return (
    categories.find((cat) => cat.id === categoryId) ||
    categories.find((cat) => cat.id === DEFAULT_CATEGORY_ID) ||
    categories[0]
  );
}

function getCategoryPresetByName(name = "") {
  const normalized = name.trim().toLowerCase();

  if (!normalized) return null;
  if (normalized.includes("기본")) return { emoji: "📂", color: "#94a3b8" };
  if (normalized.includes("운동")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "🏃");
  if (normalized.includes("청소") || normalized.includes("집안")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "🧹");
  if (normalized.includes("일") || normalized.includes("업무")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "💼");
  if (normalized.includes("건강")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "💚");
  if (normalized.includes("취미")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "⭐");
  if (normalized.includes("공부") || normalized.includes("학습")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "📚");
  if (normalized.includes("루틴") || normalized.includes("아침")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "☀️");
  if (normalized.includes("창작") || normalized.includes("만들")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "🎨");
  if (normalized.includes("휴식") || normalized.includes("쉬")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "🧘");
  if (normalized.includes("생산") || normalized.includes("집중")) return CATEGORY_EMOJI_OPTIONS.find((item) => item.emoji === "🌱");

  return null;
}

function getCategoryEmoji(category) {
  if (!category) return "🌱";
  if (typeof category.emoji === "string" && category.emoji.trim()) return category.emoji;

  const namePreset = getCategoryPresetByName(category.name);
  if (namePreset?.emoji) return namePreset.emoji;

  const colorPreset = CATEGORY_EMOJI_OPTIONS.find(
    (item) => item.color.toLowerCase() === String(category.color || "").toLowerCase()
  );
  if (colorPreset?.emoji) return colorPreset.emoji;

  return "🌱";
}

function getCategoryColor(category) {
  if (!category) return SOFT_FALLBACK_COLOR;
  if (typeof category.color === "string" && category.color.trim()) return category.color;

  const namePreset = getCategoryPresetByName(category.name);
  return namePreset?.color || SOFT_FALLBACK_COLOR;
}

export default function GoalDetail({
  goal,
  categories,
  onBack,
  onUpdateGoal,
}) {
  const progress = useMemo(() => calcProgress(goal), [goal]);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editCategoryId, setEditCategoryId] = useState(goal.categoryId || DEFAULT_CATEGORY_ID);

  const editPanelRef = useRef(null);
  const editToggleButtonRef = useRef(null);
  const categorySelectRef = useRef(null);

  const orderedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [categories]);

  const activeCategory = getCategory(categories, goal.categoryId || DEFAULT_CATEGORY_ID);
  const activeCategoryEmoji = getCategoryEmoji(activeCategory);
  const activeCategoryColor = getCategoryColor(activeCategory);

  const editingCategory = getCategory(orderedCategories, editCategoryId || DEFAULT_CATEGORY_ID);

  const startEditGoal = () => {
    setEditTitle(goal.title);
    setEditCategoryId(goal.categoryId || DEFAULT_CATEGORY_ID);
    setIsEditingGoal(true);
    setIsCategoryMenuOpen(false);
  };

  const cancelEditGoal = () => {
    setEditTitle(goal.title);
    setEditCategoryId(goal.categoryId || DEFAULT_CATEGORY_ID);
    setIsEditingGoal(false);
    setIsCategoryMenuOpen(false);
  };

  const saveEditGoal = () => {
    const title = editTitle.trim();
    if (!title) return;

    onUpdateGoal({
      ...goal,
      title,
      categoryId: editCategoryId || DEFAULT_CATEGORY_ID,
      updatedAt: Date.now(),
    });

    setIsEditingGoal(false);
    setIsCategoryMenuOpen(false);
  };


  useEffect(() => {
    const handlePointerDown = (event) => {
      const target = event.target;

      if (editToggleButtonRef.current?.contains(target)) {
        return;
      }

      if (isCategoryMenuOpen && categorySelectRef.current?.contains(target)) {
        return;
      }

      if (isCategoryMenuOpen && !categorySelectRef.current?.contains(target)) {
        setIsCategoryMenuOpen(false);
      }

      if (isEditingGoal && editPanelRef.current && !editPanelRef.current.contains(target)) {
        cancelEditGoal();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isCategoryMenuOpen, isEditingGoal, goal.title, goal.categoryId]);

  return (
    <div className="screen detailScreen">
      <header className="topBar detailTopBar">
        <button className="linkBtn" type="button" onClick={onBack}>
          ← Back
        </button>

        <button
          ref={editToggleButtonRef}
          type="button"
          className={`manageIconBtn detailMenuButton ${isEditingGoal ? "isActive" : ""}`}
          onClick={() => {
            if (isEditingGoal) {
              cancelEditGoal();
              return;
            }
            startEditGoal();
          }}
          aria-label={isEditingGoal ? "목표 수정 취소" : "목표 수정"}
          title={isEditingGoal ? "목표 수정 취소" : "목표 수정"}
        >
          ✎
        </button>
      </header>

      <ProgressHeader
        title={goal.title}
        progress={progress}
        categoryEmoji={activeCategoryEmoji}
        categoryColor={activeCategoryColor}
      />

      {isEditingGoal && (
        <section className="panel goalEditPanel softGoalEditPanel" ref={editPanelRef}>
          <div className="emptyTitle">목표 수정</div>
          <div className="emptyText">저장하거나 바깥 영역을 누르면 수정 모드가 닫힙니다.</div>

          <div className="goalEditRow softGoalEditRow">
            <input
              className="input softInput"
              value={editTitle}
              maxLength={120}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEditGoal();
                if (e.key === "Escape") cancelEditGoal();
              }}
              autoFocus
            />

            <div className="detailCategorySelect" ref={categorySelectRef}>
              <button
                type="button"
                className={`detailCategoryTrigger ${isCategoryMenuOpen ? "isOpen" : ""}`}
                style={{ "--category-color": getCategoryColor(editingCategory) }}
                onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={isCategoryMenuOpen}
              >
                <span className="detailCategoryIcon" aria-hidden="true">
                  {getCategoryEmoji(editingCategory)}
                </span>
                <span className="detailCategoryName">{editingCategory?.name || "기본"}</span>
                <span className="detailCategoryChevron" aria-hidden="true">⌄</span>
              </button>

              {isCategoryMenuOpen && (
                <div className="detailCategoryMenu" role="listbox" aria-label="목표 카테고리 선택">
                  {orderedCategories.map((cat) => {
                    const selected = editCategoryId === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        role="option"
                        aria-selected={selected}
                        className={`detailCategoryOption ${selected ? "isSelected" : ""}`}
                        style={{ "--category-color": getCategoryColor(cat) }}
                        onClick={() => {
                          setEditCategoryId(cat.id);
                          setIsCategoryMenuOpen(false);
                        }}
                      >
                        <span className="detailCategoryOptionIcon" aria-hidden="true">
                          {getCategoryEmoji(cat)}
                        </span>
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn softPrimaryBtn goalEditSaveBtn"
              onClick={saveEditGoal}
              disabled={!editTitle.trim()}
            >
              저장
            </button>
            <button
              type="button"
              className="btn softGhostBtn goalEditCancelBtn"
              onClick={cancelEditGoal}
            >
              취소
            </button>
          </div>
        </section>
      )}

      <SubtaskList goal={goal} onUpdateGoal={onUpdateGoal} />
    </div>
  );
}
