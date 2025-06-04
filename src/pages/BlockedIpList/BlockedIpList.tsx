import React, { useState, useMemo } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import IPRateLimitHistoryTable from "../../components/tables/BasicTables/IPRateLimitHistoryTable";
import { Modal } from "../../components/ui/modal";
import Button from "../../components/ui/button";
import PageMeta from "../../components/common/PageMeta";
import {
  useSearchIPRateLimitsQuery,
  useSaveIPRateLimitMutation,
  useGetIPRateLimitHistoryQuery
} from "../../services/BlockedIpList/ipRateLimit.service";
import { FiClock, FiUnlock, FiX, FiCheck, FiLoader, FiArrowUp, FiArrowDown, FiSearch, FiLock } from "react-icons/fi";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function BlockedIpList() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filters, setFilters] = useState({
    ipaddress: "",
    isblocked: "",
    startDate: null as Date | null,
    endDate: null as Date | null,
  });
  const [dateError, setDateError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const ipRateLimitsPerPage = 8;

  const { data: ipRateLimits = [], refetch } = useSearchIPRateLimitsQuery(filters);

  const [selectedIPAddress, setSelectedIPAddress] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isUnblockModalOpen, setIsUnblockModalOpen] = useState(false);
  const [unblockComment, setUnblockComment] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  const { data: ipRateLimitHistory, isLoading: isHistoryLoading } = useGetIPRateLimitHistoryQuery(
    { ipaddress: selectedIPAddress! },
    { skip: !selectedIPAddress }
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  // Date filter handlers
  const handleStartDateChange = (date: Date | null) => {
    if (date && filters.endDate && date > filters.endDate) {
      setDateError("Start date can't be after end date");
    } else {
      setDateError(null);
      setFilters((prev) => ({ ...prev, startDate: date }));
    }
    setCurrentPage(1);
  };

  const handleEndDateChange = (date: Date | null) => {
    if (date && filters.startDate && date < filters.startDate) {
      setDateError("End date can't be before start date");
    } else {
      setDateError(null);
      setFilters((prev) => ({ ...prev, endDate: date }));
    }
    setCurrentPage(1);
  };

  const handleViewHistory = (ipAddress: string) => {
    setSelectedIPAddress(ipAddress);
    setIsHistoryModalOpen(true);
  };

  const handleUnblockClick = (ipAddress: string) => {
    setSelectedIPAddress(ipAddress);
    setIsUnblockModalOpen(true);
  };

  const [saveIPRateLimit] = useSaveIPRateLimitMutation();
  const handleUnblockSubmit = async () => {
    if (!unblockComment) {
      setSaveStatus("error");
      return;
    }
    try {
      setSaveStatus("saving");
      await saveIPRateLimit({ iPaddress: selectedIPAddress!, comment: unblockComment }).unwrap();
      setSaveStatus("success");
      setTimeout(() => {
        setIsUnblockModalOpen(false);
        setUnblockComment("");
        refetch();
        setSaveStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("Failed to unblock IP:", error);
      setSaveStatus("error");
    }
  };

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredIPRateLimits = useMemo(() => {
    return ipRateLimits.filter((limit) => {
      const matchesSearch = limit.iPaddress.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filters.isblocked === "" || limit.isblocked === (filters.isblocked === "true");

      // Date filter logic
      const limitDate = new Date(limit.lastRequestTime);
      const matchesDate =
        (!filters.startDate || limitDate >= new Date(filters.startDate)) &&
        (!filters.endDate || limitDate <= new Date(new Date(limitDate).setHours(23, 59, 59, 999)));

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [ipRateLimits, searchQuery, filters]);

  const sortedIPRateLimits = useMemo(() => {
    if (!sortColumn) return filteredIPRateLimits;

    return [...filteredIPRateLimits].sort((a, b) => {
      let aValue: any = a[sortColumn as keyof typeof a];
      let bValue: any = b[sortColumn as keyof typeof b];

      if (aValue == null) return sortDirection === "asc" ? -1 : 1;
      if (bValue == null) return sortDirection === "asc" ? 1 : -1;

      if (typeof aValue === "boolean") aValue = aValue ? 1 : 0;
      if (typeof bValue === "boolean") bValue = bValue ? 1 : 0;

      if (sortColumn === "latestRequestTime") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (typeof aValue === "string" && !isNaN(Number(aValue))) {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }

      if (typeof aValue === "string") aValue = aValue.toLowerCase();
      if (typeof bValue === "string") bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredIPRateLimits, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedIPRateLimits.length / ipRateLimitsPerPage);
  const currentIPRateLimits = useMemo(() => {
    const startIndex = (currentPage - 1) * ipRateLimitsPerPage;
    return sortedIPRateLimits.slice(startIndex, startIndex + ipRateLimitsPerPage);
  }, [sortedIPRateLimits, currentPage]);

  const getSortIcon = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === "asc" ? <FiArrowUp className="ml-1" /> : <FiArrowDown className="ml-1" />;
    }
    return null;
  };

  return (
    <>
      <PageMeta title="Blocked IP List" description="" />
      {/* <PageBreadcrumb pageTitle="Blocked IP List" /> */}
      <ComponentCard title="Blocked IP List" className="shadow-xl rounded-3xl border border-gray-200 dark:border-gray-700">

        {/* <div className="space-y-6 relative p-6 bg-white rounded-2xl shadow-lg dark:bg-gray-900"> */}
        <div className="space-y-6 relative p-6">
          {/* Search and Filter Section */}
          <div className="flex gap-4 items-center w-full">
            <div className="relative flex-1">
              <div className="flex rounded-full shadow-md hover:shadow-lg transition-shadow w-full bg-gray-100 dark:bg-gray-800">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  <FiSearch className="w-6 h-6" />
                </span>
                <input
                  type="text"
                  placeholder="Search IP addresses..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full py-3 pl-14 pr-4 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg bg-transparent text-base bg-white dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <Button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="px-6 py-3 border rounded-full bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 shadow-md transition-colors flex items-center gap-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700"
            >
              <svg
                className="w-6 h-6 text-gray-700 dark:text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              {/* <span className="hidden sm:inline">Filters</span> */}
            </Button>
          </div>

          {/* Filter Panel */}
          {isFilterOpen && (
            <>
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
                onClick={() => setIsFilterOpen(false)}
              />
              <div
                className="fixed top-13 right-0 h-[calc(100%-5rem)] w-96 bg-white dark:bg-gray-900 shadow-2xl transition-transform duration-300 ease-in-out z-50 rounded-l-3xl flex flex-col"
                style={{ minHeight: "calc(100vh - 5rem)" }}
              >
                {/* Filter Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Advanced Filters
                    </h3>
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                      aria-label="Close filter panel"
                    >
                      <FiX className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Filter Body - Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase dark:text-gray-400 tracking-wider">
                      Status Filters
                    </h4>
                    <div className="space-y-4">
                      <select
                        name="isblocked"
                        value={filters.isblocked}
                        onChange={handleFilterChange}
                        className="w-full p-3 border border-gray-300 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      >
                        <option value="">All Statuses</option>
                        <option value="true">Blocked</option>
                        <option value="false">Unblocked</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase dark:text-gray-400 tracking-wider">
                      Date Range
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          From
                        </label>
                        <DatePicker
                          selected={filters.startDate}
                          onChange={handleStartDateChange}
                          selectsStart
                          startDate={filters.startDate}
                          endDate={filters.endDate}
                          maxDate={filters.endDate || new Date()}
                          placeholderText="Select start date"
                          className="w-full p-3 border border-gray-300 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          wrapperClassName="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          To
                        </label>
                        <DatePicker
                          selected={filters.endDate}
                          onChange={handleEndDateChange}
                          selectsEnd
                          startDate={filters.startDate}
                          endDate={filters.endDate}
                          minDate={filters.startDate || undefined}
                          maxDate={new Date()}
                          placeholderText="Select end date"
                          className="w-full p-3 border border-gray-300 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          wrapperClassName="w-full"
                        />
                      </div>
                      {dateError && (
                        <div className="text-red-500 text-sm mt-1">
                          {dateError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Filter Footer - Fixed at Bottom */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex space-x-4">
                    <Button
                      onClick={() => {
                        setFilters({
                          ipaddress: "",
                          isblocked: "",
                          startDate: null,
                          endDate: null,
                        });
                        setDateError(null);
                        setCurrentPage(1);
                      }}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-white py-4 text-lg rounded-2xl transition"
                    >
                      Clear All
                    </Button>
                    <Button
                      onClick={() => {
                        setIsFilterOpen(false);
                        refetch();
                      }}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-4 text-lg rounded-2xl transition"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Table */}
          <div className="overflow-hidden rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 mt-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSort("iPaddress")}
                    >
                      <div className="flex items-center">
                        IP Address
                        {getSortIcon("iPaddress")}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSort("requestCount")}
                    >
                      <div className="flex items-center">
                        Request Count
                        {getSortIcon("requestCount")}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSort("latestRequestTime")}
                    >
                      <div className="flex items-center">
                        Latest Request Time
                        {getSortIcon("latestRequestTime")}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSort("isblocked")}
                    >
                      <div className="flex items-center">
                        Status
                        {getSortIcon("isblocked")}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {currentIPRateLimits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-gray-500 dark:text-gray-400">
                        No requests found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    currentIPRateLimits.map((limit) => (
                      <tr
                        key={limit.iPaddress}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                          {limit.iPaddress}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {limit.requestCount ?? 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {limit.lastRequestTime ? new Date(limit.lastRequestTime).toLocaleString() : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {limit.isblocked ? (
                              <>
                                <FiLock className="mr-2 text-red-500" />
                                <span className="text-red-600 dark:text-red-400">Blocked</span>
                              </>
                            ) : (
                              <>
                                <FiUnlock className="mr-2 text-green-500" />
                                <span className="text-green-600 dark:text-green-400">Unblocked</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex gap-2">
                            <Button
                              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition duration-300"
                              onClick={() => handleViewHistory(limit.iPaddress)}
                            >
                              <FiClock className="inline mr-1" />
                              History
                            </Button>
                            {limit.isblocked && (
                              <Button
                                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg shadow-md transition duration-300"
                                onClick={() => handleUnblockClick(limit.iPaddress)}
                              >
                                <FiUnlock className="inline mr-1" />
                                Unblock
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex justify-center gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg shadow-md transition duration-300 ${currentPage === 1
                  ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                }`}
              aria-label="Go to first page"
            >
              {"<<"}
            </Button>
            <Button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg shadow-md transition duration-300 ${currentPage === 1
                  ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                }`}
              aria-label="Go to previous page"
            >
              {"<"}
            </Button>
            <span className="flex items-center gap-1 sm:gap-2 dark:text-white/40 text-sm sm:text-lg font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg shadow-md transition duration-300 ${currentPage === totalPages || totalPages === 0
                  ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                }`}
              aria-label="Go to next page"
            >
              {">"}
            </Button>
            <Button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg shadow-md transition duration-300 ${currentPage === totalPages || totalPages === 0
                  ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                }`}
              aria-label="Go to last page"
            >
              {">>"}
            </Button>
          </div>
        </div>
      </ComponentCard>
      {/* History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        className="max-w-4xl rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-8 bg-white dark:bg-gray-900 rounded-3xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white/90 tracking-tight">
              IP Rate Limit History - {selectedIPAddress}
            </h2>
          </div>
          {isHistoryLoading ? (
            <div className="flex items-center justify-center py-8">
              <FiLoader className="animate-spin text-blue-500 text-3xl mr-3" />
              <span className="text-lg font-medium">Loading history...</span>
            </div>
          ) : ipRateLimitHistory ? (
            <IPRateLimitHistoryTable history={ipRateLimitHistory} 
            showRequestCount={filters.isblocked === "false"}
            />
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">No history found.</p>
          )}
        </div>
      </Modal>

      {/* Unblock Modal */}
      <Modal
        isOpen={isUnblockModalOpen}
        onClose={() => {
          setIsUnblockModalOpen(false);
          setUnblockComment("");
          setSaveStatus("idle");
        }}
        className="max-w-md rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-8 bg-white dark:bg-gray-900 rounded-3xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white/90 tracking-tight">
              Unblock IP Address
            </h2>
            <button
              onClick={() => setIsUnblockModalOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                IP Address
              </label>
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white">
                {selectedIPAddress}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Comment (Required)
              </label>
              <textarea
                value={unblockComment}
                onChange={(e) => setUnblockComment(e.target.value)}
                className={`w-full p-4 border border-gray-300 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${saveStatus === "error" && !unblockComment ? "border-red-500 dark:border-red-500" : ""
                  }`}
                rows={4}
                placeholder="Enter a reason for unblocking..."
              />
              {saveStatus === "error" && !unblockComment && (
                <p className="text-red-500 dark:text-red-400 text-sm mt-2">Comment is required</p>
              )}
            </div>

            {/* Status message */}
            {saveStatus === "success" && (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
                <FiCheck className="h-5 w-5" />
                <span>IP address unblocked successfully!</span>
              </div>
            )}
            {saveStatus === "error" && unblockComment && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Error unblocking IP. Please try again.</span>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                onClick={() => setIsUnblockModalOpen(false)}
                disabled={saveStatus === "saving"}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 text-lg rounded-xl transition dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUnblockSubmit}
                disabled={saveStatus === "saving"}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 text-lg rounded-xl transition min-w-24"
              >
                {saveStatus === "saving" ? (
                  <>
                    <FiLoader className="animate-spin mr-2 inline" />
                    Saving...
                  </>
                ) : (
                  "Unblock"
                )}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
