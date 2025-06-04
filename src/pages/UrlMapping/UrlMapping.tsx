import { useState, useEffect, useMemo } from "react";
// import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import { Modal } from "../../components/ui/modal";
import Button from "../../components/ui/button";
import PageMeta from "../../components/common/PageMeta";
import { useSaveUrlMappingMutation } from "../../services/UrlMapping/save";
import { useSearchUrlMappingsQuery } from "../../services/UrlMapping/search";
import { FiCheck, FiLoader, FiX, FiSearch, FiArrowUp, FiArrowDown } from "react-icons/fi";
import KeyMappingModal from "../../components/tables/BasicTables/KeyMappingModal"; // Adjust the path as needed


interface UrlMapping {
  id: number | null;
  incomingurl: string;
  mappedurl: string;
  isactive: boolean;
  mappingcount?: number;
}

type SortDirection = "asc" | "desc";

export default function UrlMappingManagement() {
  const [urlMappings, setUrlMappings] = useState<UrlMapping[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [formData, setFormData] = useState<UrlMapping>({
    id: null,
    incomingurl: "",
    mappedurl: "",
    isactive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [highlightedItem, setHighlightedItem] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filters, setFilters] = useState({
    incomingurl: "",
    mappedurl: "",
    isactive: -1,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const urlMappingsPerPage = 8;
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [isKeyMappingModalOpen, setIsKeyMappingModalOpen] = useState(false);
  const [selectedUrlMappingId, setSelectedUrlMappingId] = useState<number | null>(null);

  const { data: searchUrlMappings, refetch } = useSearchUrlMappingsQuery({
    incomingurl: filters.incomingurl,
    mappedurl: filters.mappedurl,
    isactive: filters.isactive,
  });

  const [saveUrlMapping] = useSaveUrlMappingMutation();

  useEffect(() => {
    if (searchUrlMappings) {
      console.log(searchUrlMappings);
      setUrlMappings(searchUrlMappings);
    }
  }, [searchUrlMappings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        setSaveStatus("saving");
        const payload = {
          id: formData.id || null,
          incomingurl: formData.incomingurl,
          mappedurl: formData.mappedurl,
          isactive: formData.isactive,
        };

        await saveUrlMapping(payload).unwrap();
        setSaveStatus("success");

        if (payload.id) {
          setHighlightedItem(payload.id);
          setTimeout(() => setHighlightedItem(null), 2000);
        }

        setTimeout(() => {
          setIsFormOpen(false);
          setFormData({
            id: null,
            incomingurl: "",
            mappedurl: "",
            isactive: true,
          });
          refetch();
          setSaveStatus("idle");
        }, 3000);
      } catch (error:any) {
        if (error?.data?.message) {
          // Display the error message from the backend
          setErrors({ incomingurl: error.data.message });
        } else {
          console.error("Error saving URL mapping:", error);
          setSaveStatus("error");
        }    
        setSaveStatus("error");
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.incomingurl) newErrors.incomingurl = "Incoming URL is required";
    if (!formData.mappedurl) newErrors.mappedurl = "Mapped URL is required";
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
    const { name, value, type, checked } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (checked ? 1 : -1) : value,
    }));
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

  const filteredUrlMappings = useMemo(() => {
    return urlMappings.filter((mapping) => {
      const matchesSearch =
        mapping.incomingurl.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mapping.mappedurl.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesIncomingUrl = filters.incomingurl
        ? mapping.incomingurl.toLowerCase().includes(filters.incomingurl.toLowerCase())
        : true;
      const matchesMappedUrl = filters.mappedurl
        ? mapping.mappedurl.toLowerCase().includes(filters.mappedurl.toLowerCase())
        : true;
      const matchesActive = filters.isactive === -1 || mapping.isactive === (filters.isactive === 1);
      return matchesSearch && matchesIncomingUrl && matchesMappedUrl && matchesActive;
    });
  }, [urlMappings, searchQuery, filters]);

  const sortedUrlMappings = useMemo(() => {
    if (!sortColumn) return filteredUrlMappings;

    return [...filteredUrlMappings].sort((a, b) => {
      let aValue: any = a[sortColumn as keyof UrlMapping];
      let bValue: any = b[sortColumn as keyof UrlMapping];

      if (aValue === null) return sortDirection === "asc" ? -1 : 1;
      if (bValue === null) return sortDirection === "asc" ? 1 : -1;

      if (typeof aValue === "boolean") aValue = aValue ? 1 : 0;
      if (typeof bValue === "boolean") bValue = bValue ? 1 : 0;

      if (typeof aValue === "string") aValue = aValue.toLowerCase();
      if (typeof bValue === "string") bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredUrlMappings, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedUrlMappings.length / urlMappingsPerPage);
  const currentUrlMappings = useMemo(() => {
    const startIndex = (currentPage - 1) * urlMappingsPerPage;
    return sortedUrlMappings.slice(startIndex, startIndex + urlMappingsPerPage);
  }, [sortedUrlMappings, currentPage]);

  return (
    <>
      <PageMeta title="URL Mapping Management" description="" />
      {/* <PageBreadcrumb pageTitle="URL Mapping Management" /> */}
      <ComponentCard title="URL Mapping Management" className="shadow-xl rounded-3xl border border-gray-200 dark:border-gray-700">
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
                  placeholder="Search URL mappings..."
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
              {/* <span className="hidden sm:inline">Filters</span> */}
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
                      URL Filters
                    </h4>
                    <div className="space-y-4">
                      <label className="block">
                        <span className="text-gray-700 dark:text-gray-300">Incoming URL</span>
                        <input
                          type="text"
                          name="incomingurl"
                          value={filters.incomingurl}
                          onChange={handleFilterChange}
                          className="mt-1 block w-full p-3 border border-gray-300 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                      </label>
                      <label className="block">
                        <span className="text-gray-700 dark:text-gray-300">Mapped URL</span>
                        <input
                          type="text"
                          name="mappedurl"
                          value={filters.mappedurl}
                          onChange={handleFilterChange}
                          className="mt-1 block w-full p-3 border border-gray-300 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase dark:text-gray-400 tracking-wider">
                      Active
                    </h4>
                    <select
                      value={filters.isactive === 1 ? "yes" : filters.isactive === 0 ? "no" : "all"}
                      onChange={(e) => {
                        setFilters({
                          ...filters,
                          isactive: e.target.value === "yes" ? 1 : e.target.value === "no" ? 0 : -1
                        });
                      }}
                      className="w-full p-4 border border-gray-300 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    >
                      <option value="all">All</option>
                      <option value="yes">Active</option>
                      <option value="no">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Filter Footer - Fixed at Bottom */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex space-x-4">
                    <Button
                      onClick={() => {
                        setFilters({
                          incomingurl: "",
                          mappedurl: "",
                          isactive: -1,
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
                      onClick={() => handleSort("incomingurl")}
                    >
                      <div className="flex items-center">
                        Incoming URL
                        {getSortIcon("incomingurl")}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSort("mappedurl")}
                    >
                      <div className="flex items-center">
                        Mapped URL
                        {getSortIcon("mappedurl")}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSort("mappingcount")}
                    >
                      <div className="flex items-center">
                        Mapped Count
                        {getSortIcon("mappingcount")}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => handleSort("isactive")}
                    >
                      <div className="flex items-center">
                        Active
                        {getSortIcon("isactive")}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {currentUrlMappings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-gray-500 dark:text-gray-400">
                        No requests found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    currentUrlMappings.map((mapping) => (
                      <tr
                        key={mapping.id || Math.random()}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${highlightedItem === mapping.id ? "bg-yellow-100 dark:bg-yellow-900" : ""
                          }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                          {mapping.incomingurl}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                          {mapping.mappedurl}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        {mapping.mappingcount ?? 0}
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {mapping.isactive ? "Yes" : "No"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex space-x-2">
                            <Button
                              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition duration-300"
                              onClick={() => {
                                setFormData(mapping);
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
                            <Button
                              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg shadow-md transition duration-300"
                              onClick={() => {
                                if (mapping.id) {
                                  setSelectedUrlMappingId(mapping.id);
                                  setIsKeyMappingModalOpen(true);
                                }
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
                                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                                />
                              </svg>
                            </Button>
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
              className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg shadow-md transition duration-300 ${currentPage === 1 ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed" : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                }`}
              aria-label="Go to first page"
            >
              {"<<"}
            </Button>
            <Button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg shadow-md transition duration-300 ${currentPage === 1 ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed" : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
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
              className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg shadow-md transition duration-300 ${currentPage === totalPages || totalPages === 0 ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed" : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                }`}
              aria-label="Go to next page"
            >
              {">"}
            </Button>
            <Button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg shadow-md transition duration-300 ${currentPage === totalPages || totalPages === 0 ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed" : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                }`}
              aria-label="Go to last page"
            >
              {">>"}
            </Button>
          </div>
        </div>
      </ComponentCard>

      {/* Add/Edit URL Mapping Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setFormData({
            id: null,
            incomingurl: "",
            mappedurl: "",
            isactive: true,
          });
          setErrors({});
          setSaveStatus("idle");
        }}
        className="max-w-md rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-8 bg-white dark:bg-gray-900 rounded-3xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white/90 tracking-tight">
              {formData.id ? "Edit URL Mapping" : "Add New URL Mapping"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Incoming URL
              </label>
              <input
                type="text"
                name="incomingurl"
                value={formData.incomingurl}
                onChange={handleInputChange}
                className={`w-full p-4 border border-gray-300 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${errors.incomingurl ? "border-red-500 dark:border-red-500" : ""
                  }`}
              />
              {errors.incomingurl && (
                <p className="text-red-500 dark:text-red-400 text-sm mt-2">{errors.incomingurl}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Mapped URL
              </label>
              <input
                type="text"
                name="mappedurl"
                value={formData.mappedurl}
                onChange={handleInputChange}
                className={`w-full p-4 border border-gray-300 rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${errors.mappedurl ? "border-red-500 dark:border-red-500" : ""
                  }`}
              />
              {errors.mappedurl && (
                <p className="text-red-500 dark:text-red-400 text-sm mt-2">{errors.mappedurl}</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isactive"
                name="isactive"
                checked={formData.isactive}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, isactive: e.target.checked }))
                }
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
              />
              <label htmlFor="isactive" className="ml-3 text-lg text-gray-700 dark:text-gray-300">
                Active
              </label>
            </div>

            {/* Status message */}
            {saveStatus === "success" && (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
                <FiCheck className="h-5 w-5" />
                <span>URL Mapping saved successfully!</span>
              </div>
            )}
            {saveStatus === "error" && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Error saving URL Mapping. Please try again.</span>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                onClick={() => setIsFormOpen(false)}
                disabled={saveStatus === "saving"}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg transition"
              >
                Cancel
              </Button>
              <Button
                disabled={saveStatus === "saving"}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg transition"
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

      {selectedUrlMappingId && (
        <KeyMappingModal
          isOpen={isKeyMappingModalOpen}
          onClose={() => {
            setIsKeyMappingModalOpen(false);
            setSelectedUrlMappingId(null);
          }}
          urlMappingId={selectedUrlMappingId}
          onSaved={() => {
            refetch(); 
          }}
        />
      )}
    </>
  );
}
