interface Props {
  id: string;
  label: string;
  value: number;
  onChange: (rating: number) => void;
}

export function StarRatingInput({ id, label, value, onChange }: Props) {
  return (
    <div className="field star-rating-field">
      <span id={`${id}-label`} className="star-rating-label">
        {label}
      </span>
      <div
        id={`${id}-group`}
        className="star-rating"
        role="group"
        aria-labelledby={`${id}-label`}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={
              n <= value ? "star-rating-btn star-rating-btn-on" : "star-rating-btn star-rating-btn-off"
            }
            aria-label={`Set rating to ${n} out of 5`}
            onClick={() => onChange(n)}
          >
            <span aria-hidden>★</span>
          </button>
        ))}
      </div>
    </div>
  );
}
