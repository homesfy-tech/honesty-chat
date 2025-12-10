import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export function ConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [micrositeFilter, setMicrositeFilter] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);

  useEffect(() => {
    async function loadConversations() {
      setLoading(true);
      try {
        const params = {};
        if (micrositeFilter) {
          params.microsite = micrositeFilter;
        }
        const response = await api.get("/chat-sessions", { params });
        setConversations(response.data.items || []);
      } catch (error) {
        console.error("Failed to fetch conversations", error);
      } finally {
        setLoading(false);
      }
    }

    loadConversations();
  }, [micrositeFilter]);

  const filteredConversations = conversations.filter((conv) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      conv.phone?.toLowerCase().includes(search) ||
      conv.microsite?.toLowerCase().includes(search) ||
      conv.leadId?.toLowerCase().includes(search)
    );
  });

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Chat Conversations</h2>
          <p className="text-sm text-slate-300">
            View all chat conversations and their full history
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Conversations List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search by phone, microsite, or lead ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Filter by microsite..."
                value={micrositeFilter}
                onChange={(e) => setMicrositeFilter(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No conversations found</div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv._id || conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-4 text-left transition-colors ${
                      selectedConversation?._id === conv._id ||
                      selectedConversation?.id === conv.id
                        ? "bg-sky-500/20 border-l-4 border-sky-400"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">
                          {conv.phone || "No phone"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDate(conv.createdAt)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {conv.microsite} • {conv.bhkType || "—"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {conv.conversation?.length || 0} messages
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conversation Detail */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="mb-6 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Conversation Details</h3>
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="text-sm text-slate-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Phone:</span>
                    <span className="ml-2 text-white">{selectedConversation.phone || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Microsite:</span>
                    <span className="ml-2 text-white">{selectedConversation.microsite || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">BHK Type:</span>
                    <span className="ml-2 text-white">{selectedConversation.bhkType || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Lead ID:</span>
                    <span className="ml-2 text-white font-mono text-xs">
                      {selectedConversation.leadId || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Started:</span>
                    <span className="ml-2 text-white">
                      {formatDate(selectedConversation.createdAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Last Updated:</span>
                    <span className="ml-2 text-white">
                      {formatDate(selectedConversation.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-300">Conversation History</h4>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {selectedConversation.conversation &&
                  selectedConversation.conversation.length > 0 ? (
                    selectedConversation.conversation.map((msg, index) => (
                      <div
                        key={index}
                        className={`rounded-lg p-3 ${
                          msg.role === "user"
                            ? "bg-sky-500/20 text-white ml-8"
                            : "bg-white/5 text-slate-200 mr-8"
                        }`}
                      >
                        <div className="text-xs text-slate-400 mb-1">
                          {msg.role === "user" ? "User" : "Agent"} • {msg.timestamp || "—"}
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{msg.content || msg.text || JSON.stringify(msg)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-slate-400 py-8">
                      No messages in this conversation
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur">
              <p className="text-slate-400">Select a conversation to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

