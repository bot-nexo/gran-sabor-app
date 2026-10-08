/** Interruptor visual (switch) reutilizable del panel. */
const Switch = ({ activo, onChange, disabled, etiqueta }) => (
  <button
    type="button"
    className={"adm-switch" + (activo ? " adm-switch--on" : "")}
    onClick={onChange}
    disabled={disabled}
    aria-label={etiqueta}
    title={etiqueta}
  >
    <span className="adm-switch__dot" />
  </button>
);

export default Switch;
