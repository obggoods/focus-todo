export default function ProgressHeader({ title, progress }) {
    return (
      <div className="progressHeader">
        <div className="progressTop">
          <div className="goalTitle">{title}</div>
          <div className="bigPct" aria-label={`progress ${progress} percent`}>
            {progress}%
          </div>
        </div>
  
        <div className="bigBarWrap" aria-hidden="true">
          <div className="bigBar" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }
  