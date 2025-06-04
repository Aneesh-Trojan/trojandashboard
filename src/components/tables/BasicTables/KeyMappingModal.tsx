import { useState, useEffect } from "react";
import Modal from "../../ui/modal";
import Button from "../../ui/button";
import { useFetchApiKeysQuery } from "../../../services/keyMapping/search";
import { useSaveKeyMappingMutation } from "../../../services/keyMapping/save";
import { FiSearch, FiCheck, FiLoader, FiX } from "react-icons/fi";

interface ApiKey {
  apikey: string;
  clientName: string;
  isCheck: boolean; 
}

interface KeyMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  urlMappingId: number;
  onSaved?: () => void;
}

const KeyMappingModal: React.FC<KeyMappingModalProps> = ({ isOpen, onClose, urlMappingId ,onSaved}) => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [filteredApiKeys, setFilteredApiKeys] = useState<ApiKey[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [initialSelectedKeys, setInitialSelectedKeys] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  const localStorageKey = `selectedKeys_${urlMappingId}`;
  const { data: fetchedApiKeys } = useFetchApiKeysQuery({ urlmapping_id: urlMappingId }) as {
    data?: ApiKey[];
  };

  useEffect(() => {
    if (isOpen && fetchedApiKeys) {
    setApiKeys(fetchedApiKeys);
  }
}, [isOpen,fetchedApiKeys]);

  useEffect(() => {
    if (isOpen && apiKeys.length > 0) {
      initializeSelectedKeys();
      setSearchTerm("");
      setSaveStatus("idle");
    }
  }, [isOpen, urlMappingId,apiKeys]);

  useEffect(() => {
    const filtered = apiKeys.filter((key) =>
      key.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      key.apikey.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const sorted = [...filtered].sort((a, b) => {
      const aSelected = selectedKeys.includes(a.apikey);
      const bSelected = selectedKeys.includes(b.apikey);
      return aSelected === bSelected ? 0 : aSelected ? -1 : 1;
    });
    setFilteredApiKeys(sorted);
  }, [apiKeys, searchTerm, selectedKeys]);

  const initializeSelectedKeys = () => {    
    const savedKeys = JSON.parse(localStorage.getItem(localStorageKey) || "null");
    if (savedKeys && Array.isArray(savedKeys)) {
      setSelectedKeys(savedKeys);
      setInitialSelectedKeys(savedKeys);
    } else  {
      const initiallySelected = apiKeys
        .filter((key) => key.isCheck)
        .map((key) => key.apikey);
    console.log("Initializing with saved keys:", initiallySelected);
    setSelectedKeys(initiallySelected);
    setInitialSelectedKeys(initiallySelected);
  }
};

  const handleCheckboxChange = (apikey: string) => {
    const updatedSelectedKeys = selectedKeys.includes(apikey)
      ? selectedKeys.filter((key) => key !== apikey)
      : [...selectedKeys, apikey];
    setSelectedKeys(updatedSelectedKeys);
  };

  const [saveKeyMapping] = useSaveKeyMappingMutation();
  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      const payload = {
        apikeyList: selectedKeys,
        urlmappingId: urlMappingId,
      };
      await saveKeyMapping(payload).unwrap();
      localStorage.setItem(localStorageKey, JSON.stringify(selectedKeys));
      setSaveStatus("success");
      if (onSaved) onSaved();
      setTimeout(() => onClose(), 3000);
    } catch (error) {
      console.error("Error saving key mapping:", error);
      setSaveStatus("error");
    }
  };

  const handleClose = () => {
    setSelectedKeys(initialSelectedKeys);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-8 bg-white dark:bg-gray-900 rounded-3xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white/90 tracking-tight">
            Link API Keys
          </h2>
          {/* <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button> */}
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search API keys..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-4">
          {filteredApiKeys.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              {searchTerm ? "No matching API keys found" : "No API keys available"}
            </div>
          ) : (
            filteredApiKeys.map((apiKey) => (
             
              <div 
                key={apiKey.apikey} 
                className={`flex items-center p-4 rounded-xl transition-colors ${
                  selectedKeys.includes(apiKey.apikey) 
                    ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800" 
                    : "hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
               
                <input
                  type="checkbox"
                  checked={selectedKeys.includes(apiKey.apikey)}
                  onChange={() => handleCheckboxChange(apiKey.apikey)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:border-gray-600"
                />
                <div className="ml-4">
                  <div className="text-gray-800 dark:text-white/90 font-medium">{apiKey.clientName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">{apiKey.apikey}</div>
                </div>
                {selectedKeys.includes(apiKey.apikey) && (
                  <FiCheck className="ml-auto text-green-500" />
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm">
            {saveStatus === "success" && (
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
                <FiCheck className="h-5 w-5" />
                <span>Saved successfully!</span>
              </div>
            )}
            {saveStatus === "error" && (
              <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Error saving. Please try again.</span>
              </div>
            )}
          </div>
          
          <div className="flex space-x-4">
            <Button
              onClick={handleClose}
              disabled={saveStatus === "saving"}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 text-lg rounded-xl transition dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
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
        </div>
      </div>
    </Modal>
  );
};

export default KeyMappingModal;