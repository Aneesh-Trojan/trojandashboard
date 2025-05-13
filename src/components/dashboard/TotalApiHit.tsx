import { LuLockKeyhole } from "react-icons/lu";
import { useGetDashboardApiCountQuery } from "../../services/Dashboard/dashboard.service";

export default function TotalApiHit() {
  const { data } = useGetDashboardApiCountQuery();
  const totalApiKey = data?.[0]?.totalApiKey ?? 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow dark:border-gray-700 dark:bg-gray-900 md:p-6">
      <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl dark:bg-blue-900/20">
        <LuLockKeyhole className="text-blue-600 size-6 dark:text-blue-400" />
      </div>

      <div className="mt-5">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Total API Keys
        </span>
        <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
          {totalApiKey}
        </h4>
      </div>
    </div>
  );
}