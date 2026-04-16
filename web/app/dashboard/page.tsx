"use client";

import { useEffect, useState } from "react";
import { Users, Utensils, Coffee, Moon, Edit2, Trash2, Check, X, Mail, Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";

type Participant = {
  id: string;
  name: string;
  email: string;
  role: string;
  token: string;
  created_at: string;
  meal_usage: {
    meal_type: string;
    is_used: boolean;
    used_at: string | null;
  }[];
};

const ROLES = ["Participant", "Volunteer", "Faculty", "OC"];

export default function DashboardPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "Participant", sendEmail: true });

  const [addingBulk, setAddingBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkTotal, setBulkTotal] = useState(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/participants");
      const data = await res.json();
      setParticipants(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm({ name: "", email: "", role: "Participant", sendEmail: true });
      fetchParticipants();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleBulkSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!bulkText.trim()) return;
    
    setAddingBulk(true);
    const lines = bulkText.split("\n").filter(l => l.trim().length > 0);
    setBulkTotal(lines.length);
    setBulkProgress(0);

    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(",").map(s => s.trim());
      const name = parts[0];
      const email = parts[1];
      const role = parts[2] || "Participant";
      
      if (name && email) {
        try {
          await fetch("/api/participants", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, role, sendEmail: form.sendEmail }),
          });
        } catch (err) {
          console.error("Failed to add", email, err);
        }
      }
      setBulkProgress(i + 1);
    }

    setBulkText("");
    setAddingBulk(false);
    fetchParticipants();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setBulkText(text);
    };
    reader.readAsText(file);
  };

  const startEdit = (p: Participant) => {
    setEditingId(p.id);
    setEditForm({ name: p.name, email: p.email, role: p.role || "Participant" });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/participants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingId(null);
        fetchParticipants();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteParticipant = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this participant?")) return;
    try {
      const res = await fetch(`/api/participants/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchParticipants();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resendEmail = async (id: string) => {
    if (!window.confirm("Resend email to this participant?")) return;
    setResendingId(id);
    try {
      const res = await fetch(`/api/participants/${id}/resend`, { method: "POST" });
      if (res.ok) {
        alert("Email resent successfully!");
      } else {
        const err = await res.json();
        alert("Failed to resend: " + err.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to resend email.");
    } finally {
      setResendingId(null);
    }
  };

  const exportToExcel = () => {
    if (participants.length === 0) return;
    
    // Format data for sheet
    const data = participants.map(p => {
      const ht = p.meal_usage?.find((m) => m.meal_type === "high_tea")?.is_used;
      const lu = p.meal_usage?.find((m) => m.meal_type === "lunch")?.is_used;
      const di = p.meal_usage?.find((m) => m.meal_type === "dinner")?.is_used;

      return {
        Name: p.name,
        Email: p.email,
        Role: p.role || "Participant",
        Token: p.token,
        "High Tea": ht ? "Yes" : "No",
        Lunch: lu ? "Yes" : "No",
        Dinner: di ? "Yes" : "No",
        "Created At": new Date(p.created_at).toLocaleString()
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Participants");
    XLSX.writeFile(workbook, "Participants.xlsx");
  };

  const highTeaCount = participants.reduce((acc, p) => acc + (p.meal_usage?.find((m) => m.meal_type === "high_tea")?.is_used ? 1 : 0), 0);
  const lunchCount = participants.reduce((acc, p) => acc + (p.meal_usage?.find((m) => m.meal_type === "lunch")?.is_used ? 1 : 0), 0);
  const dinnerCount = participants.reduce((acc, p) => acc + (p.meal_usage?.find((m) => m.meal_type === "dinner")?.is_used ? 1 : 0), 0);
  const total = participants.length;

  // Sorting logic (sort by Role then Name)
  const sortedParticipants = [...participants].sort((a, b) => {
    const roleCompare = (a.role || "").localeCompare(b.role || "");
    if (roleCompare !== 0) return roleCompare;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row items-center justify-between gap-4">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500">
            Admin Dashboard
          </h1>
          <button
            onClick={() => {
               document.cookie = "auth_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
               window.location.href = "/";
            }}
            className="text-sm font-medium text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
          >
            Logout
          </button>
        </header>

        {/* Stats Section */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Participants" value={total} max={0} Icon={Users} color="text-blue-500" />
          <StatCard title="High Tea Used" value={highTeaCount} max={total} Icon={Coffee} color="text-amber-500" />
          <StatCard title="Lunch Used" value={lunchCount} max={total} Icon={Utensils} color="text-emerald-500" />
          <StatCard title="Dinner Used" value={dinnerCount} max={total} Icon={Moon} color="text-indigo-500" />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Add Form / Bulk Add Column */}
          <section className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Add User</h2>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                  <input
                    type="text" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input
                    type="email" required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1 w-full px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="mt-1 w-full px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="sendEmail"
                    checked={form.sendEmail}
                    onChange={(e) => setForm({ ...form, sendEmail: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="sendEmail" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                    Send Email with QR
                  </label>
                </div>
                <button type="submit" disabled={adding} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-md transition disabled:opacity-50 text-sm">
                  {adding ? "Adding..." : "Add User"}
                </button>
              </form>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Bulk Add</h2>
              <div className="space-y-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Format: Name, Email, Role (Optional)
                </p>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="John Doe, john@example.com, Volunteer&#10;Jane Smith, jane@example.com"
                  className="w-full px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white h-32"
                />
                
                <div className="flex items-center justify-between">
                  <label className="flex items-center justify-center w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm">
                    <Upload size={16} className="mr-2" />
                    Upload CSV
                    <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                {addingBulk && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${(bulkProgress / bulkTotal) * 100}%` }}></div>
                    <p className="text-xs text-center mt-1 text-gray-500">{bulkProgress} / {bulkTotal}</p>
                  </div>
                )}

                <button onClick={() => handleBulkSubmit()} disabled={addingBulk || !bulkText.trim()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-md transition disabled:opacity-50 text-sm">
                  {addingBulk ? "Processing..." : "Bulk Add"}
                </button>
              </div>
            </div>
          </section>

          {/* Table */}
          <section className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Participant List</h2>
              <button 
                onClick={exportToExcel} 
                className="flex items-center text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
              >
                <Download size={16} className="mr-2" /> Export to Excel
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
                <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
                  <tr>
                    <th className="px-4 md:px-6 py-3 font-medium">Name & Email</th>
                    <th className="px-4 py-3 font-medium cursor-pointer" title="Sorted automatically">Role ↓</th>
                    <th className="px-3 py-3 font-medium cursor-help" title="High Tea">☕ HT</th>
                    <th className="px-3 py-3 font-medium cursor-help" title="Lunch">🍱 LU</th>
                    <th className="px-3 py-3 font-medium cursor-help" title="Dinner">🌙 DI</th>
                    <th className="px-4 md:px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                  {loading ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                  ) : sortedParticipants.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No participants yet.</td></tr>
                  ) : (
                    sortedParticipants.map((p) => {
                      const isEditing = editingId === p.id;
                      if (isEditing) {
                        return (
                          <tr key={p.id} className="bg-indigo-50/50 dark:bg-indigo-900/20">
                            <td className="px-4 md:px-6 py-4 space-y-2">
                              <input type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="Name" />
                              <input type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="Email" />
                            </td>
                            <td className="px-4 py-4">
                              <select value={editForm.role} onChange={(e) => setEditForm({...editForm, role: e.target.value})} className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white">
                                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </td>
                            <td colSpan={3} className="px-3 py-4 text-xs text-gray-400">(Meals uneditable)</td>
                            <td className="px-4 md:px-6 py-4 text-right space-x-3">
                              <button onClick={() => saveEdit(p.id)} disabled={savingEdit} className="text-green-600 hover:text-green-800 transition"><Check size={18} /></button>
                              <button onClick={cancelEdit} disabled={savingEdit} className="text-gray-400 hover:text-gray-600 transition"><X size={18} /></button>
                            </td>
                          </tr>
                        );
                      }

                      const ht = p.meal_usage?.find((m) => m.meal_type === "high_tea")?.is_used;
                      const lu = p.meal_usage?.find((m) => m.meal_type === "lunch")?.is_used;
                      const di = p.meal_usage?.find((m) => m.meal_type === "dinner")?.is_used;

                      return (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                          <td className="px-4 md:px-6 py-4">
                            <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                            <div className="text-xs text-gray-500">{p.email}</div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 whitespace-nowrap">
                              {p.role || "Participant"}
                            </span>
                          </td>
                          <td className="px-3 py-4">{ht ? "✅" : "❌"}</td>
                          <td className="px-3 py-4">{lu ? "✅" : "❌"}</td>
                          <td className="px-3 py-4">{di ? "✅" : "❌"}</td>
                          <td className="px-4 md:px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <button onClick={() => resendEmail(p.id)} disabled={resendingId === p.id} className="text-amber-500 hover:text-amber-700 disabled:opacity-50" title="Resend Email">
                                <Mail size={16} />
                              </button>
                              <button onClick={() => startEdit(p)} className="text-blue-500 hover:text-blue-700" title="Edit">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => deleteParticipant(p.id)} className="text-red-500 hover:text-red-700" title="Delete">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, max, Icon, color }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-full bg-opacity-10 dark:bg-opacity-20 flex-shrink-0 ${color.replace('text-', 'bg-')} ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {value} <span className="text-lg text-gray-400 font-normal">{max > 0 ? `/ ${max}` : ""}</span>
        </p>
      </div>
    </div>
  );
}
