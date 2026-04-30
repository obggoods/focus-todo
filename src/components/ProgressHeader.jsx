export default function ProgressHeader({ title, progress, categoryEmoji = "🌱", categoryColor = "#8BCB6A" }) {
  return (
    <div className="progressHeader softProgressHeader" style={{ "--category-color": categoryColor }}>
      <div className="progressTop softProgressTop">
        <div className="detailGoalTitleWrap">
          <div className="detailGoalEmoji" aria-hidden="true">
            {categoryEmoji}
          </div>
          <div className="goalTitle">{title}</div>
        </div>

        <div className="bigPct" aria-label={`progress ${progress} percent`}>
          {progress}%
        </div>
      </div>

      <div className="bigBarWrap" aria-hidden="true">
        <div className="bigBar softBigBar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
