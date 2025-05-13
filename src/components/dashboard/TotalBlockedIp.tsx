import { ImBlocked } from "react-icons/im";
import { useGetDashboardApiCountQuery } from "../../services/Dashboard/dashboard.service";

export default function TotalBlockedIp() {
  const { data } = useGetDashboardApiCountQuery();
  const totalBlockedIP = data?.[0]?.totalBlockedIP ?? 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow dark:border-gray-700 dark:bg-gray-900 md:p-6">
      <div className="flex items-center justify-center w-12 h-12 bg-red-50 rounded-xl dark:bg-red-900/20">
        <ImBlocked className="text-red-600 size-6 dark:text-red-400" />
      </div>

      <div className="mt-5">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Total Blocked IP
        </span>
        <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
          {totalBlockedIP}
        </h4>
      </div>
    </div>
  );
}