import CrudPage from "../components/CrudPage";

export default function Subjects() {
  return (
    <CrudPage
      title="Subjects"
      label="Subject"
      endpoint="/subjects"
      fields={[{ name: "name", label: "Subject Name", placeholder: "e.g. Maths", required: true }]}
    />
  );
}
