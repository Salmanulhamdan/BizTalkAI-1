import CompanyListItem from "../CompanyListItem";

export default function CompanyListItemExample() {
  return (
    <div className="px-4">
      <CompanyListItem
        company="Al Ameen bakery"
        onClick={(company) => console.log("Clicked:", company)}
      />
    </div>
  );
}
