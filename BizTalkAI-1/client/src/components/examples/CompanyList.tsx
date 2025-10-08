import CompanyList from "../CompanyList";

const mockCompanies = [
  "Al Ameen bakery",
  "Al Ameen Restaurant",
  "Alpha Industries",
  "Beta Solutions",
  "Charlie Ventures"
] as const;

export default function CompanyListExample() {
  return (
    <CompanyList
      companies={[...mockCompanies]}
      onCompanyClick={(company) => console.log("Selected:", company)}
    />
  );
}
