// ½ to 5 star rating. Tap the left half of a star for a half star; tap the same rating again to clear it.
export default function Stars({ value, onChange, size = 22 }: { value?: number; onChange?: (v: number | undefined) => void; size?: number }) {
  const v = value ?? 0;
  return (
    <span className="stars" role={onChange ? 'radiogroup' : 'img'} aria-label={v ? `${v} out of 5 stars` : 'Not rated'} style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = v >= n ? 100 : v >= n - 0.5 ? 50 : 0;
        const star = (
          <span className="starglyph" style={{ ['--fill' as string]: `${fill}%` }}>★</span>
        );
        if (!onChange) return <span key={n}>{star}</span>;
        return (
          <span key={n} className="starbtn">
            {star}
            <button className="half left" aria-label={`${n - 0.5} stars`} onClick={() => onChange(v === n - 0.5 ? undefined : n - 0.5)} />
            <button className="half right" aria-label={`${n} stars`} onClick={() => onChange(v === n ? undefined : n)} />
          </span>
        );
      })}
    </span>
  );
}
