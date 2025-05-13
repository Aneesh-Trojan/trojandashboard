import { useState, useEffect, useMemo } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import { Modal } from "../../components/ui/modal";
import Button from "../../components/ui/button";
import PageMeta from "../../components/common/PageMeta";
import { useSearchApiKeysQuery } from "../../services/ApiKey/search";
import { useSaveApiKeyMutation } from "../../services/ApiKey/save";
import { FiCheck, FiLoader, FiX, FiSearch, FiArrowUp, FiArrowDown } from "react-icons/fi";

interface ApiKey {
  apiKey: string | null;
  clientName: string;
  isActive: boolean;
  isIpCheck: boolean;
  isCountryCheck: boolean;
  isRegionCheck: boolean;
}

type SortDirection = "asc" | "desc";

export default function ApiKeyManagement() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [formData, setFormData] = useState<ApiKey>({
    apiKey: null,
    clientName: "",
    isActive: false,
    isIpCheck: false,
    isCountryCheck: false,
    isRegionCheck: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filters, setFilters] = useState({
    isActive: false,
    isIpCheck: false,
    isCountryCheck: false,
    isRegionCheck: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const apiKeysPerPage = 8;
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const { data: searchApiKeys, refetch } = useSearchApiKeysQuery({
    clientName: searchQuery,
    isActive: filters.isActive ? 1 : -1,
    isIpCheck: filters.isIpCheck ? 1 : -1,
    isCountryCheck: filters.isCountryCheck ? 1 : -1,
    isRegionCheck: filters.isRegionCheck ? 1 : -1,
  });

  const [saveApiKey] = useSaveApiKeyMutation();

  useEffect(() => {
    if (searchApiKeys) {
      setApiKeys(searchApiKeys);
    }
  }, [searchApiKeys]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        setSaveStatus("saving");
        const payload = {
          apiKey: formData.apiKey || null,
          clientName: formData.clientName,
          isActive: formData.isActive,
          isIpCheck: formData.isIpCheck,
          isCountryCheck: formData.isCountryCheck,
          isRegionCheck: formData.isRegionCheck,
        };

        await saveApiKey(payload).unwrap();
        setSaveStatus("success");
        setTimeout(() => {
          setIsFormOpen(false);
          setFormData({
            apiKey: null,
            clientName: "",
            isActive: false,
            isIpCheck: false,
            isCountryCheck: false,
            isRegionCheck: false,
          });
          refetch();
          setSaveStatus("idle");
        }, 1000);
      } catch (error) {
        console.error("Error saving API key:", error);
        setSaveStatus("error");
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.clientName) newErrors.clientName = "Client Name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFilters((prev) => ({ ...prev, [name]: checked }));
    setCurrentPage(1);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === "asc" ? <FiArrowUp className="ml-1" /> : <FiArrowDown className="ml-1" />;
    }
    return null;
  };

  const filteredApiKeys = useMemo(() => {
    return apiKeys.filter((key) => {
      const matchesSearch = key.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesActive = !filters.isActive || key.isActive;
      const matchesIpCheck = !filters.isIpCheck || key.isIpCheck;
      const matchesCountryCheck = !filters.isCountryCheck || key.isCountryCheck;
      const matchesRegionCheck = !filters.isRegionCheck || key.isRegionCheck;
      return matchesSearch && matchesActive && matchesIpCheck && matchesCountryCheck && matchesRegionCheck;
    });
  }, [apiKeys, searchQuery, filters]);

const sortedApiKeys = useMemo(() => {
  if (!sortColumn) return filteredApiKeys;

  return [...filteredApiKeys].sort((a, b) => {
    let aValue: any = a[sortColumn as keyof ApiKey];
    let bValue: any = b[sortColumn as keyof ApiKey];

    if (aValue === null || aValue === undefined) return sortDirection === "asc" ? -1 : 1;
    if (bValue === null || bValue === undefined) return sortDirection === "asc" ? 1 : -1;

    if (typeof aValue === "boolean") aValue = aValue ? 1 : 0;
    if (typeof bValue === "boolean") bValue = bValue ? 1 : 0;

    if (typeof aValue === "string") aValue = aValue.trim().toLowerCase();
    if (typeof bValue === "string") bValue = bValue.trim().toLowerCase();

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });
}, [filteredApiKeys, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedApiKeys.length / apiKeysPerPage);
  const currentApiKeys = useMemo(() => {
    const startIndex = (currentPage - 1) * apiKeysPerPage;
    return sortedApiKeys.slice(startIndex, startIndex + apiKeysPerPage);
  }, [sortedApiKeys, currentPage]);

  return (
    <>
      <PageMeta title="API Key Management" description="" />
      <PageBreadcrumb pageTitle="API Key Management" />
      <ComponentCard title="Manage API Keys" className="shadow-xl rounded-3xl border border-gray-200 dark:border-gray-700">
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
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full py-3 pl-14 pr-4 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg bg-transparent  text-base bg-white dark:bg-gray-700 dark:text-white"
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
            <Button
              onClick={() => setIsFormOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-full transition-colors text-lg shadow-md"
            >
              <span className="pr-2 text-xl">+</span>Add
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
                      Status Filters
                    </h4>
                    <div className="space-y-4">
                      {[
                        { label: "Active", key: "isActive" },
                        { label: "IP Check", key: "isIpCheck" },
                        { label: "Country Check", key: "isCountryCheck" },
                        { label: "Region Check", key: "isRegionCheck" },
                      ].map((filter) => (
                        <label key={filter.key} className="flex items-center space-x-4 group">
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              checked={filters[filter.key as keyof typeof filters]}
                              onChange={() =>
                                setFilters((prev) => ({
                                  ...prev,
                                  [filter.key]: !prev[filter.key as keyof typeof filters],
                                }))
                              }
                              className="w-6 h-6 text-blue-600 border-gray-300 rounded focus:ring-blue-500 group-hover:border-blue-400 dark:bg-gray-800 dark:border-gray-700"
                            />
                          </div>
                          <span className="text-gray-700 group-hover:text-gray-900 text-lg dark:text-gray-300 dark:group-hover:text-white">
                            {filter.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-4 border-t border-gray-200 dark:border-gray-700 pt-8">
                    <Button
                      onClick={() =>
                        setFilters({
                          isActive: false,
                          isIpCheck: false,
                          isCountryCheck: false,
                          isRegionCheck: false,
                        })
                      }
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
                      onClick={() => handleSort("clientName")}
                    >
                      <div className="flex items-center">
                        Client Name
                        {getSortIcon("clientName")}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSort("apiKey")}
                    >
                      <div className="flex items-center">
                        API Key
                        {getSortIcon("apiKey")}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSort("isActive")}
                    >
                      <div className="flex items-center">
                        Active
                        {getSortIcon("isActive")}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSort("isIpCheck")}
                    >
                      <div className="flex items-center">
                        IP Check
                        {getSortIcon("isIpCheck")}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSort("isCountryCheck")}
                    >
                      <div className="flex items-center">
                        Country Check
                        {getSortIcon("isCountryCheck")}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSort("isRegionCheck")}
                    >
                      <div className="flex items-center">
                        Region Check
                        {getSortIcon("isRegionCheck")}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {currentApiKeys.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-gray-500 dark:text-gray-400">
                        No requests found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    currentApiKeys.map((key) => (
                      <tr key={key.apiKey || Math.random()} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                          {key.clientName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                          {key.apiKey}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {key.isActive ? "Yes" : "No"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {key.isIpCheck ? "Yes" : "No"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {key.isCountryCheck ? "Yes" : "No"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {key.isRegionCheck ? "Yes" : "No"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <Button
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition duration-300"
                            onClick={() => {
                              setFormData(key);
                              setIsFormOpen(true);
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
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
              className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg shadow-md transition duration-300 ${currentPage === 1 ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed" : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"}`}
              aria-label="Go to first page"
            >
              {"<<"}
            </Button>
            <Button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg shadow-md transition duration-300 ${currentPage === 1 ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed" : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"}`}
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
              className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg shadow-md transition duration-300 ${currentPage === totalPages || totalPages === 0 ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed" : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"}`}
              aria-label="Go to next page"
            >
              {">"}
            </Button>
            <Button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg shadow-md transition duration-300 ${currentPage === totalPages || totalPages === 0 ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed" : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"}`}
              aria-label="Go to last page"
            >
              {">>"}
            </Button>
          </div>
        </div>
      </ComponentCard>

      {/* Add/Edit API Key Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setFormData({
            apiKey: null,
            clientName: "",
            isActive: false,
            isIpCheck: false,
            isCountryCheck: false,
            isRegionCheck: false,
          });
          setErrors({});
          setSaveStatus("idle");
        }}
        className="max-w-md rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-8 bg-white dark:bg-gray-900 rounded-3xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white/90 tracking-tight">
                {formData.apiKey ? "Edit API Key" : "Add New API Key"}
              </h2>
            </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Client Name
              </label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleInputChange}
                className={`w-full p-4 border border-gray-300 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition \${errors.clientName ? "border-red-500 dark:border-red-500" : ""}`}
              />
              {errors.clientName && (
                <p className="text-red-500 dark:text-red-400 text-sm mt-2">{errors.clientName}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleCheckboxChange}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                />
                <label htmlFor="isActive" className="ml-3 text-lg text-gray-700 dark:text-gray-300">
                  Active
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isIpCheck"
                  name="isIpCheck"
                  checked={formData.isIpCheck}
                  onChange={handleCheckboxChange}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                />
                <label htmlFor="isIpCheck" className="ml-3 text-lg text-gray-700 dark:text-gray-300">
                  IP Check
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isCountryCheck"
                  name="isCountryCheck"
                  checked={formData.isCountryCheck}
                  onChange={handleCheckboxChange}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                />
                <label htmlFor="isCountryCheck" className="ml-3 text-lg text-gray-700 dark:text-gray-300">
                  Country Check
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRegionCheck"
                  name="isRegionCheck"
                  checked={formData.isRegionCheck}
                  onChange={handleCheckboxChange}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                />
                <label htmlFor="isRegionCheck" className="ml-3 text-lg text-gray-700 dark:text-gray-300">
                  Region Check
                </label>
              </div>
            </div>

            {/* Status message */}
            {saveStatus === "success" && (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
                <FiCheck className="h-5 w-5" />
                <span>API Key saved successfully!</span>
              </div>
            )}
            {saveStatus === "error" && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Error saving API Key. Please try again.</span>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                onClick={() => setIsFormOpen(false)}
                disabled={saveStatus === "saving"}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 text-lg rounded-xl transition dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
              >
                Cancel
              </Button>
              <Button
                disabled={saveStatus === "saving"}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 text-lg rounded-xl transition min-w-24"
              >
                {saveStatus === "saving" ? (
                  <>
                    <FiLoader className="animate-spin mr-2 inline" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
