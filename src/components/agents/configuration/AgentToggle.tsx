interface AgentToggleProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}

/**
 * Not the design-system `Switch`: its `Thumb` className is hardcoded, so the knob size is
 * unreachable. Sizes are raw px because Tailwind's scales compile to rem and would scale
 * with the surrounding typography.
 */
const AgentToggle = ({
  id,
  checked,
  onCheckedChange,
  disabled = false,
  'aria-label': ariaLabel,
}: AgentToggleProps) => (
  <label
    className={`relative block h-[24px] w-[42px] flex-[0_0_42px] rounded-full transition-colors duration-[160ms] focus-within:ring-[3px] focus-within:ring-ring/35 ${
      checked ? 'bg-primary' : 'bg-muted-foreground/40'
    } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
  >
    <input
      id={id}
      type="checkbox"
      role="switch"
      aria-label={ariaLabel}
      checked={checked}
      disabled={disabled}
      onChange={event => onCheckedChange(event.target.checked)}
      className="pointer-events-none absolute h-0 w-0 opacity-0"
    />
    <span
      aria-hidden="true"
      className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-[left] duration-[160ms] ${
        checked ? 'left-[21px]' : 'left-[3px]'
      }`}
    />
  </label>
);

export default AgentToggle;
