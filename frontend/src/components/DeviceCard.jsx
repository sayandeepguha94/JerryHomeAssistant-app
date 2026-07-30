import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Lightbulb, Fan, Snowflake, Tv, Loader2 } from "lucide-react";

const ICONS = {
  lighting: Lightbulb,
  fan: Fan,
  ac: Snowflake,
  media: Tv,
};

export default function DeviceCard({ device, onToggle, onValueChange, disabled, loading }) {
  const Icon = ICONS[device.category] || Lightbulb;
  const on = device.on;

  // Local state for optimistic slider movement
  const [localValue, setLocalValue] = useState(device.value || 1);
  const debounceRef = useRef(null);

  // Sync local value with prop when not dragging
  useEffect(() => {
    setLocalValue(device.value || 1);
  }, [device.value]);

  const handleSliderChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setLocalValue(val);

    // Debounce the server call
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onValueChange?.(device, val);
    }, 150); // 150ms debounce
  };

  return (
    <motion.button
      data-testid={`device-card-${device.id.replace(/\s+/g, "-")}`}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      onClick={() => !disabled && onToggle?.(device)}
      disabled={disabled}
      className={`relative w-full text-left glass rounded-3xl p-5 min-h-[128px] flex flex-col justify-between overflow-hidden ${
        on ? "border-[#E05D26]/40" : ""
      } ${disabled ? "opacity-60" : ""}`}
      style={on ? { boxShadow: "0 0 30px rgba(224,93,38,0.18)" } : {}}
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors ${
            on ? "bg-[#E05D26] text-white" : "bg-white/5 text-white/60"
          }`}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
        </div>
        <div className={`w-2 h-2 rounded-full ${on ? "bg-[#B4F733]" : "bg-white/20"}`} />
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-white/40">{device.room}</p>
        <p className="font-heading text-lg font-semibold leading-tight">{device.name}</p>
        <p className={`text-xs mt-1 ${on ? "text-[#E05D26]" : "text-white/40"}`}>{device.statusText}</p>
      </div>

      {device.category === "fan" && device.room.toLowerCase() === "living room" && on && onValueChange && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="range"
            min={1}
            max={5}
            value={localValue}
            onChange={handleSliderChange}
            className="jerry-range w-full"
            data-testid={`device-fan-speed-${device.id.replace(/\s+/g, "-")}`}
          />
        </div>
      )}
    </motion.button>
  );
}
