import CrudPage from "../components/CrudPage";

export default function Classes() {
  return (
    <CrudPage
      title="Classes"
      label="Class"
      endpoint="/classes"
      fields={[
        { name: "name", label: "Class Name", placeholder: "e.g. Class 9", required: true },
        { name: "section", label: "Section (optional)", placeholder: "e.g. A" },
      ]}
    />
  );
}
