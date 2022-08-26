import { useLayoutEffect } from "react";
import { ReactComponent as Note } from "../../assets/note2.svg";
import { ReactComponent as Notebook } from "../../assets/notebook.svg";
import { ReactComponent as Monographs } from "../../assets/monographs.svg";
import { ReactComponent as Search } from "../../assets/search.svg";
import { ReactComponent as Tag } from "../../assets/tag.svg";
import { ReactComponent as Trash } from "../../assets/trash.svg";
import { ReactComponent as Fav } from "../../assets/fav.svg";
import { ReactComponent as Attachment } from "../../assets/attachment.svg";

const Placeholders = {
  note: Note,
  notebook: Notebook,
  topic: Notebook,
  monograph: Monographs,
  search: Search,
  tag: Tag,
  trash: Trash,
  favorites: Fav,
  attachments: Attachment
};

export default function PlaceholderLoader({ name, onLoad, ...restProps }) {
  const Component = Placeholders[name];
  useLayoutEffect(() => {
    onLoad && onLoad();
  }, [onLoad]);

  if (!Component) return null;
  return <Component {...restProps} />;
}
