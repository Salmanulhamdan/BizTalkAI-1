import SearchBar from "../SearchBar";
import { useState } from "react";

export default function SearchBarExample() {
  const [value, setValue] = useState("");

  return (
    <SearchBar
      value={value}
      onChange={setValue}
      onSearch={() => console.log("Search:", value)}
    />
  );
}
