import PageMeta from "../../components/common/PageMeta";
import ApiHitsOverview from "../../components/dashboard/ApiHitsOverview";
import MonthlyApiHit from "../../components/dashboard/MonthlyApiHit";
import TotalApiHit from "../../components/dashboard/TotalApiHit";
import TotalBlockedIp from "../../components/dashboard/TotalBlockedIp";
import RequestTableData from "../../components/dashboard/RequestTableData";

export default function Home() {
  return (
    <>
      <PageMeta title="Dashboard" description="" />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
            <TotalApiHit />
            <TotalBlockedIp />
          </div>
          <ApiHitsOverview />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <MonthlyApiHit />
        </div>

        <div className="col-span-12">
          <RequestTableData />
        </div>
      </div>
    </>
  );
}