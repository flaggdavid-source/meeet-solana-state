import { forwardRef } from "react";
import { Star } from "lucide-react";

interface AgentShareCardProps {
  name: string;
  category: string;
  rating: number;
  reviews: number;
  price: number;
  hires: number;
  responseTime: string;
  initials: string;
  bgColor: string;
}

const AgentShareCard = forwardRef<HTMLDivElement, AgentShareCardProps>(
  ({ name, category, rating, reviews, price, hires, responseTime, initials, bgColor }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #16213e 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 60,
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Purple gradient overlay at bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 200,
            background: "linear-gradient(to top, rgba(124, 58, 237, 0.15), transparent)",
            pointerEvents: "none",
          }}
        />

        {/* Top section */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 32 }}>
          {/* Avatar */}
          <div
            className={bgColor}
            style={{
              width: 120,
              height: 120,
              borderRadius: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 48,
              fontWeight: 700,
              border: "2px solid rgba(255,255,255,0.1)",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ color: "white", fontSize: 48, fontWeight: 700, marginBottom: 12 }}>{name}</div>
            <div
              style={{
                display: "inline-block",
                padding: "6px 16px",
                borderRadius: 8,
                fontSize: 18,
                fontWeight: 600,
                textTransform: "capitalize",
                background: "rgba(139, 92, 246, 0.2)",
                color: "#a78bfa",
                border: "1px solid rgba(139, 92, 246, 0.3)",
              }}
            >
              {category}
            </div>

            {/* Rating */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    style={{ width: 24, height: 24, color: i < Math.round(rating) ? "#fbbf24" : "#4b5563", fill: i < Math.round(rating) ? "#fbbf24" : "none" }}
                  />
                ))}
              </div>
              <span style={{ color: "#9ca3af", fontSize: 20 }}>
                {rating.toFixed(1)} ({reviews} reviews)
              </span>
            </div>
          </div>

          {/* Price */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ color: "white", fontSize: 44, fontWeight: 700 }}>${price}</div>
            <div style={{ color: "#9ca3af", fontSize: 18 }}>per month</div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 24 }}>
          {[
            { label: "Total Hires", value: hires.toLocaleString() },
            { label: "Rating", value: rating.toFixed(1) },
            { label: "Reviews", value: reviews.toString() },
            { label: "Response Time", value: responseTime },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "20px 24px",
                textAlign: "center",
              }}
            >
              <div style={{ color: "white", fontSize: 28, fontWeight: 700 }}>{s.value}</div>
              <div style={{ color: "#9ca3af", fontSize: 14, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Footer with branding */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, position: "relative", zIndex: 1 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #7c3aed, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 16 }}>
            M
          </div>
          <span style={{ color: "#9ca3af", fontSize: 18 }}>meeet.world</span>
        </div>
      </div>
    );
  }
);

AgentShareCard.displayName = "AgentShareCard";
export default AgentShareCard;
