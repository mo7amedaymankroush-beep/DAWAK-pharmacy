const money = (value) =>
  `${Number(value || 0).toLocaleString("en-US")} ج.م`;

export default money;
