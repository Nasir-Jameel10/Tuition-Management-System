// Response se array nikalo (array ho, ya {data: []}, {students: []} waghera)
export function unwrap(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  const keys = ["data", "students", "classes", "subjects", "fees", "items", "results"];
  for (const k of keys) {
    if (Array.isArray(d?.[k])) return d[k];
  }
  return [];
}

export const getName = (s) => s?.name || s?.fullName || "-";

export const getClass = (s) => {
  const c = s?.class ?? s?.className ?? s?.classId;
  if (!c) return "-";
  return typeof c === "object" ? c.name || "-" : c;
};

export const isPaid = (f) => String(f?.status).toLowerCase() === "paid";

export const money = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;