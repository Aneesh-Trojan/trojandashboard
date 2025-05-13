import React, { useState, useEffect, useMemo } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import { Modal } from "../../components/ui/modal";
import Button from "../../components/ui/button";
import PageMeta from "../../components/common/PageMeta";
import { useSearchRequestLogsQuery } from "../../services/RequestLog/search";
import { useGetRequestLogDetailsQuery } from "../../services/RequestLog/details";
import { FiLoader, FiSearch, FiX, FiArrowUp, FiArrowDown } from "react-icons/fi";
import { FcViewDetails } from "react-icons/fc";

type SortDirection = 'asc' | 'desc';

export default function RequestLogManagement() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filters, setFilters] = useState({
    url: "",
    httpmethod: "",
    ipaddress: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const requestLogsPerPage = 8;

  // Fetch request logs
  const { data: requestLogs = [], refetch } = useSearchRequestLogsQuery(filters);

  // State for handling details modal
  const [selectedRequestLogId, setSelectedRequestLogId] = useState<string | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [currentDetails, setCurrentDetails] = useState<any>(null);

  // Fetch request log details
  const { data: requestLogDetails, isLoading: isDetailsLoading, refetch: refetchDetails } = useGetRequestLogDetailsQuery(
    { requestlogid: selectedRequestLogId! },
    { skip: !selectedRequestLogId }
  );

  // Update current details when new data is fetched
  useEffect(() => {
    if (requestLogDetails) {
      setCurrentDetails(requestLogDetails);
    }
  }, [requestLogDetails]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? <FiArrowUp className="ml-1" /> : <FiArrowDown className="ml-1" />;
    }
    return null;
  };

  // Handle view details
  const handleViewDetails = (requestLogId: string) => {
    if (requestLogId === selectedRequestLogId) {
      refetchDetails();
    } else {
      setSelectedRequestLogId(requestLogId);
    }
    setIsDetailsModalOpen(true);
    setCurrentDetails(null);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Handle filter change
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  // Filtered request logs based on search and filters
  const filteredRequestLogs = useMemo(() => {
    return requestLogs.filter((log) => {
      const matchesSearch =
        log.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.httpMethod.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.ipAddress.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [requestLogs, searchQuery]);

  // Map the filteredRequestLogs to match the RequestLogTable's RequestLog interface
  const mappedRequestLogs = useMemo(() => filteredRequestLogs.map((log) => ({
    requestLogId: log.requestLogId,
    url: log.url,
    httpMethod: log.httpMethod,
    requestUrl: log.requestUrl,
    ipAddress: log.ipAddress,
    browser: log.browser,
    machine: log.machine,
    country: log.country,
    createdAt: log.createdAt,
    apiKey: log.apiKey,
    clientName: log.clientName,
    responseStatusCode: log.responseStatusCode || 0,
  })), [filteredRequestLogs]);

  // Sort the request logs
  const sortedRequestLogs = useMemo(() => {
    if (!sortColumn) return mappedRequestLogs;

    return [...mappedRequestLogs].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'requestLogId':
          aValue = (a.requestLogId || '').toLowerCase();
          bValue = (b.requestLogId || '').toLowerCase();
          break;
        case 'url':
          aValue = (a.url || '').toLowerCase();
          bValue = (b.url || '').toLowerCase();
          break;
        case 'clientName':
          aValue = (a.clientName || '').toLowerCase();
          bValue = (b.clientName || '').toLowerCase();
          break;
        case 'httpMethod':
          aValue = (a.httpMethod || '').toLowerCase();
          bValue = (b.httpMethod || '').toLowerCase();
          break;
        case 'ipAddress':
          aValue = (a.ipAddress || '').toLowerCase();
          bValue = (b.ipAddress || '').toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'responseStatusCode':
          aValue = a.responseStatusCode;
          bValue = b.responseStatusCode;
          break;
        default:
          aValue = '';
          bValue = '';
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [mappedRequestLogs, sortColumn, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(sortedRequestLogs.length / requestLogsPerPage);
  const currentRequestLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * requestLogsPerPage;
    return sortedRequestLogs.slice(startIndex, startIndex + requestLogsPerPage);
  }, [sortedRequestLogs, currentPage]);

  return (
    <>
      <PageMeta title="Request Log Management" description="" />
      <PageBreadcrumb pageTitle="Request Log Management" />
      <ComponentCard title="Manage Request Logs" className="shadow-xl rounded-3xl border border-gray-200 dark:border-gray-700">

      <div className="space-y-6 relative p-6">
        {/* Search and Filter Section */}
        <div className="flex gap-4 items-center w-full">
          <div className="relative flex-1">
            <div className="flex rounded-full shadow-md hover:shadow-lg transition-shadow w-full bg-gray-100 dark:bg-gray-800">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                <FiSearch className="w-5 h-5" />
              </span>
              <input
                type="text"
                placeholder="Search request logs..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full py-3 pl-12 pr-4 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg bg-transparent text-base bg-white dark:bg-gray-700 dark:text-white"
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
            <span className="hidden sm:inline">Filters</span>
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
              className="fixed top-20 right-0 h-[calc(100%-5rem)] w-96 bg-white dark:bg-gray-900 shadow-2xl transition-transform duration-300 ease-in-out z-50 rounded-l-3xl p-8 flex flex-col"
              style={{ minHeight: "calc(100vh - 5rem)" }}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  Advanced Filters
                </h3>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                  aria-label="Close filter panel"
                >
                  <FiX className="w-7 h-7" />
                </button>
              </div>

              <div className="space-y-8 flex-1 overflow-y-auto pr-6">
                <div className="space-y-6">
                  <h4 className="text-base font-semibold text-gray-500 uppercase dark:text-gray-400 tracking-wide">
                    Filters
                  </h4>
                  <div className="space-y-4">
                    <input
                      type="text"
                      name="url"
                      placeholder="URL"
                      value={filters.url}
                      onChange={handleFilterChange}
                      className="w-full p-4 border border-gray-300 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                    <input
                      type="text"
                      name="httpmethod"
                      placeholder="HTTP Method"
                      value={filters.httpmethod}
                      onChange={handleFilterChange}
                      className="w-full p-4 border border-gray-300 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                    <input
                      type="text"
                      name="ipaddress"
                      placeholder="IP Address"
                      value={filters.ipaddress}
                      onChange={handleFilterChange}
                      className="w-full p-4 border border-gray-300 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <div className="flex space-x-4 border-t border-gray-200 dark:border-gray-700 pt-8">
                  <Button
                    onClick={() => {
                      setFilters({
                        url: "",
                        httpmethod: "",
                        ipaddress: "",
                      });
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
        <div className="overflow-hidden rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => handleSort('requestLogId')}
                  >
                    <div className="flex items-center">
                      Request Log Id
                      {getSortIcon('requestLogId')}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => handleSort('url')}
                  >
                    <div className="flex items-center">
                      URL
                      {getSortIcon('url')}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => handleSort('clientName')}
                  >
                    <div className="flex items-center">
                     Client Name
                      {getSortIcon('clientName')}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => handleSort('responseStatusCode')}
                  >
                    <div className="flex items-center">
                      Response Status Code
                      {getSortIcon('responseStatusCode')}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => handleSort('httpMethod')}
                  >
                    <div className="flex items-center">
                      HTTP Method
                      {getSortIcon('httpMethod')}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => handleSort('ipAddress')}
                  >
                    <div className="flex items-center">
                      IP Address
                      {getSortIcon('ipAddress')}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center">
                      Created At
                      {getSortIcon('createdAt')}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {currentRequestLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-gray-500 dark:text-gray-400">
                      No requests found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  currentRequestLogs.map((log) => (
                    <tr 
                      key={log.requestLogId} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white/90">
                          {log.requestLogId || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white/90">
                          {log.url || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {log.clientName || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {log.responseStatusCode || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {log.httpMethod || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {log.ipAddress || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Button
                          onClick={() => handleViewDetails(log.requestLogId)}
                        >
                          <FcViewDetails className="text-xl" />
                        </Button>
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
            className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg shadow-md transition duration-300 ${
              currentPage === 1 
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
            className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg shadow-md transition duration-300 ${
              currentPage === 1 
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
            className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg shadow-md transition duration-300 ${
              currentPage === totalPages || totalPages === 0
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
            className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg shadow-md transition duration-300 ${
              currentPage === totalPages || totalPages === 0
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

      {/* Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedRequestLogId(null);
          setCurrentDetails(null);
        }}
        className="max-w-3xl rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-8 bg-white dark:bg-gray-900 rounded-3xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white/90 tracking-tight">
              Request Log Details
            </h2>
          </div>
          
          {isDetailsLoading && !currentDetails ? (
            <div className="flex items-center justify-center py-8">
              <FiLoader className="animate-spin text-blue-500 text-2xl mr-2" />
              <span>Loading details...</span>
            </div>
          ) : currentDetails ? (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Request Log ID
                  </label>
                  <p className="text-gray-900 dark:text-white/90 font-semibold text-lg break-words">
                    {currentDetails.requestlogid}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Request URL
                  </label>
                  <p className="text-gray-900 dark:text-white/90 font-semibold text-lg break-words">
                    {currentDetails.requesturl}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Response Status Code
                  </label>
                  <p className="text-gray-900 dark:text-white/90 font-semibold text-lg">
                    {currentDetails.responsestatuscode || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Response Message
                  </label>
                  <p className="text-gray-900 dark:text-white/90 font-semibold text-lg">
                    {currentDetails.responsemessage || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Created At
                  </label>
                  <p className="text-gray-900 dark:text-white/90 font-semibold text-lg">
                    {new Date(currentDetails.createdat).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                  Request Params
                </label>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className="text-gray-800 dark:text-white/90 break-words">
                    {currentDetails.requestparams || "N/A"}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                  Request Data
                </label>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className="text-gray-800 dark:text-white/90 break-words">
                    {currentDetails.requestdata || "N/A"}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                  Response Data
                </label>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className="text-gray-800 dark:text-white/90 break-words">
                    {currentDetails.responsedata || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No details found.</p>
          )}
        </div>
      </Modal>
    </>
  );
}