"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable, Column } from "@/components/features/data-table";
import { PortFormDialog } from "./port-form-dialog";

interface PortData {
  id: string;
  name: string;
  code: string;
  city: string;
  province: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

export default function PortsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const actionParam = searchParams.get("action");

  const [ports, setPorts] = useState<PortData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(actionParam === "new");
  const [editingPort, setEditingPort] = useState<PortData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [portToDelete, setPortToDelete] = useState<PortData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPorts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });

      if (search) params.append("search", search);

      const res = await fetch(`/api/ports?${params}`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Failed to load ports");
      }

      // API returns { success, data: { data: [...], pagination: {...} } }
      const responseData = result.data;
      setPorts(responseData?.data || []);
      setTotalItems(responseData?.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPorts();
  }, [page, pageSize]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchPorts();
      } else {
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async () => {
    if (!portToDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/ports/${portToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete port");
      }

      fetchPorts();
      setDeleteDialogOpen(false);
      setPortToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<PortData>[] = [
    {
      key: "name",
      header: "Port",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.code}</p>
        </div>
      ),
    },
    {
      key: "city",
      header: "City",
      sortable: true,
    },
    {
      key: "province",
      header: "Province",
      sortable: true,
    },
    {
      key: "address",
      header: "Address",
      render: (row) => (
        <span className="text-sm text-muted-foreground truncate max-w-50 block">
          {row.address || "-"}
        </span>
      ),
    },
    {
      key: "coordinates",
      header: "Coordinates",
      render: (row) =>
        row.latitude && row.longitude ? (
          <span className="text-xs font-mono text-muted-foreground">
            {row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setEditingPort(row);
                setFormDialogOpen(true);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setPortToDelete(row);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Ports Management
          </h1>
          <p className="text-muted-foreground">Manage departure and arrival ports</p>
        </div>
        <Button
          onClick={() => {
            setEditingPort(null);
            setFormDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Port
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ports List</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={ports}
            isLoading={isLoading}
            page={page}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            emptyMessage="No ports found"
          />
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <PortFormDialog
        open={formDialogOpen}
        onOpenChange={(open) => {
          setFormDialogOpen(open);
          if (!open) {
            setEditingPort(null);
            router.replace("/admin/ports");
          }
        }}
        port={editingPort}
        onSuccess={() => {
          setFormDialogOpen(false);
          setEditingPort(null);
          fetchPorts();
          router.replace("/admin/ports");
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Port</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{portToDelete?.name}</strong>? This action
              cannot be undone. Ports with existing routes cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
