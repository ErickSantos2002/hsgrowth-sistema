import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ],
};

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  return (
    <div className="rich-text-editor">
      <ReactQuill theme="snow" value={value} onChange={onChange} modules={MODULES} placeholder={placeholder} />
    </div>
  );
}
