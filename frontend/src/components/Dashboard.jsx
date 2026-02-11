import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  MoreVertical,
  Home,
  MapPin,
  Building2,
  DollarSign,
  Activity,
  ExternalLink,
  Bed,
  Bath,
  Car,
  Edit,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { API } from "@/App";

export const Dashboard = () => {
  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSuburb, setSelectedSuburb] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [addingProperty, setAddingProperty] = useState(false);
  const [suburbs, setSuburbs] = useState([]);

  const fetchProperties = useCallback(async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedSuburb && selectedSuburb !== "all") params.suburb = selectedSuburb;

      const response = await axios.get(`${API}/properties`, { params });
      setProperties(response.data);

      // Extract unique suburbs
      const uniqueSuburbs = [...new Set(response.data.map((p) => p.suburb).filter(Boolean))];
      setSuburbs(uniqueSuburbs);
    } catch (error) {
      toast.error("Failed to fetch properties");
      console.error(error);
    }
  }, [searchTerm, selectedSuburb]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProperties(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, [fetchProperties, fetchStats]);

  const handleAddProperty = async (e) => {
    e.preventDefault();
    if (!newUrl.trim()) {
      toast.error("Please enter a property URL");
      return;
    }

    setAddingProperty(true);
    try {
      const response = await axios.post(`${API}/properties`, {
        url: newUrl,
        nickname: newNickname || null,
      });
      toast.success("Property added successfully!");
      setNewUrl("");
      setNewNickname("");
      fetchProperties();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add property");
    } finally {
      setAddingProperty(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/properties/${id}`);
      toast.success("Property removed");
      fetchProperties();
      fetchStats();
    } catch (error) {
      toast.error("Failed to delete property");
    }
  };

  const handleRefresh = async (id) => {
    try {
      await axios.post(`${API}/properties/${id}/refresh`);
      toast.success("Property data refreshed");
      fetchProperties();
      fetchStats();
    } catch (error) {
      toast.error("Failed to refresh property");
    }
  };

  const seedDemoData = async () => {
    try {
      await axios.post(`${API}/demo/seed`);
      toast.success("Demo data loaded!");
      fetchProperties();
      fetchStats();
    } catch (error) {
      toast.error("Failed to load demo data");
    }
  };

  const formatCurrency = (value) => {
    if (!value) return "—";
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatChange = (change, percent) => {
    if (change === null || change === undefined) return { text: "—", icon: Minus, color: "value-neutral" };
    if (change > 0) return { text: `+${formatCurrency(change)} (${percent}%)`, icon: TrendingUp, color: "value-up" };
    if (change < 0) return { text: `${formatCurrency(change)} (${percent}%)`, icon: TrendingDown, color: "value-down" };
    return { text: "No change", icon: Minus, color: "value-neutral" };
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 md:p-12">
      {/* Header */}
      <header className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2" data-testid="dashboard-title">
              Property Tracker
            </h1>
            <p className="text-lg text-muted-foreground">
              Track and analyze your Australian property portfolio
            </p>
          </div>
          <Button
            onClick={seedDemoData}
            variant="outline"
            className="btn-outline"
            data-testid="seed-demo-btn"
          >
            Load Demo Data
          </Button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12" data-testid="stats-grid">
        <Card className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Properties
            </span>
          </div>
          <p className="font-serif text-3xl font-normal" data-testid="stat-total-properties">
            {loading ? <Skeleton className="h-9 w-16" /> : stats?.total_properties || 0}
          </p>
        </Card>

        <Card className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-accent/20">
              <DollarSign className="w-5 h-5 text-accent" />
            </div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Total Value
            </span>
          </div>
          <p className="font-serif text-3xl font-normal" data-testid="stat-total-value">
            {loading ? (
              <Skeleton className="h-9 w-32" />
            ) : (
              formatCurrency(stats?.total_value)
            )}
          </p>
        </Card>

        <Card className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Active
            </span>
          </div>
          <p className="font-serif text-3xl font-normal" data-testid="stat-active">
            {loading ? <Skeleton className="h-9 w-16" /> : stats?.active || 0}
          </p>
        </Card>

        <Card className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Avg Change
            </span>
          </div>
          <p className={`font-serif text-3xl font-normal ${stats?.average_daily_change > 0 ? 'value-up' : stats?.average_daily_change < 0 ? 'value-down' : ''}`} data-testid="stat-avg-change">
            {loading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              `${stats?.average_daily_change > 0 ? '+' : ''}${stats?.average_daily_change || 0}%`
            )}
          </p>
        </Card>
      </div>

      {/* Add Property Section */}
      <Card className="mb-12 border-2 border-dashed border-border hover:border-primary/30 transition-colors" data-testid="add-property-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-serif">
            <Plus className="w-5 h-5" />
            Add Property to Track
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddProperty} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Enter property.com.au URL..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="h-12"
                data-testid="url-input"
              />
            </div>
            <div className="md:w-48">
              <Input
                placeholder="Nickname (optional)"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                className="h-12"
                data-testid="nickname-input"
              />
            </div>
            <Button
              type="submit"
              disabled={addingProperty}
              className="btn-primary h-12"
              data-testid="add-property-btn"
            >
              {addingProperty ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Property
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11"
            data-testid="search-input"
          />
        </div>
        <Select value={selectedSuburb} onValueChange={setSelectedSuburb}>
          <SelectTrigger className="w-[200px] h-11" data-testid="suburb-filter">
            <SelectValue placeholder="Filter by suburb" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suburbs</SelectItem>
            {suburbs.map((suburb) => (
              <SelectItem key={suburb} value={suburb}>
                {suburb}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="properties-grid">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="property-card">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </div>
            </Card>
          ))
        ) : properties.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <Home className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-serif font-medium mb-2">No properties yet</h3>
            <p className="text-muted-foreground mb-6">
              Add a property URL above or load demo data to get started
            </p>
          </div>
        ) : (
          properties.map((property, index) => (
            <PropertyCard
              key={property.id}
              property={property}
              onDelete={handleDelete}
              onRefresh={handleRefresh}
              onUpdateValue={async (id, value) => {
                try {
                  await axios.patch(`${API}/properties/${id}/value`, { current_value: value });
                  toast.success("Property value updated!");
                  fetchProperties();
                  fetchStats();
                } catch (error) {
                  toast.error("Failed to update value");
                }
              }}
              formatCurrency={formatCurrency}
              formatChange={formatChange}
              style={{ animationDelay: `${index * 0.1}s` }}
            />
          ))
        )}
      </div>
    </div>
  );
};

const PropertyCard = ({ property, onDelete, onRefresh, onUpdateValue, formatCurrency, formatChange, style }) => {
  const [editValue, setEditValue] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const change = formatChange(property.daily_change, property.daily_change_percent);
  const ChangeIcon = change.icon;

  const placeholderImages = [
    "https://images.unsplash.com/photo-1758548157747-285c7012db5b?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "https://images.unsplash.com/photo-1757439402190-99b73ac8e807?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "https://images.unsplash.com/photo-1758548157275-d939cf0f0e32?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
  ];

  const imageUrl = property.image_url || placeholderImages[Math.abs(property.id.charCodeAt(0)) % 3];

  const handleSaveValue = () => {
    const numValue = parseFloat(editValue.replace(/[^0-9.]/g, ''));
    if (numValue && numValue > 0) {
      onUpdateValue(property.id, numValue);
      setIsEditOpen(false);
      setEditValue("");
    }
  };

  return (
    <Card 
      className="property-card opacity-0 animate-fade-in" 
      style={style}
      data-testid={`property-card-${property.id}`}
    >
      <div className="relative overflow-hidden">
        <img
          src={imageUrl}
          alt={property.address || "Property"}
          className="property-card-image"
          onError={(e) => {
            e.target.src = placeholderImages[0];
          }}
        />
        <div className="absolute top-4 right-4">
          <Badge
            variant={property.status === "active" ? "default" : property.status === "pending" ? "secondary" : "destructive"}
            className="shadow-sm"
            data-testid={`property-status-${property.id}`}
          >
            {property.status}
          </Badge>
        </div>
        {property.property_type && (
          <div className="absolute bottom-4 left-4">
            <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
              {property.property_type}
            </Badge>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            {property.nickname && (
              <p className="text-sm font-medium text-primary mb-1">{property.nickname}</p>
            )}
            <h3 className="font-serif text-lg font-medium truncate" title={property.address}>
              {property.address || "Loading address..."}
            </h3>
            {property.suburb && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {property.suburb}, {property.state} {property.postcode}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`property-menu-${property.id}`}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRefresh(property.id)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={property.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on property.com.au
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(property.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Current Value</p>
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" data-testid={`edit-value-${property.id}`}>
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-serif">Update Property Value</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Enter the current estimated value for:<br />
                    <span className="font-medium text-foreground">{property.address || property.nickname}</span>
                  </p>
                  <Input
                    placeholder="e.g., 750000"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    data-testid="value-input"
                  />
                  <Button onClick={handleSaveValue} className="w-full btn-primary" data-testid="save-value-btn">
                    Save Value
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <p className="font-serif text-3xl font-normal" data-testid={`property-value-${property.id}`}>
            {property.current_value ? formatCurrency(property.current_value) : (
              <span className="text-muted-foreground text-xl">Click Edit to add</span>
            )}
          </p>
        </div>

        <div className={`flex items-center gap-2 ${change.color}`} data-testid={`property-change-${property.id}`}>
          <ChangeIcon className="w-4 h-4" />
          <span className="text-sm font-medium">{change.text}</span>
        </div>

        {(property.bedrooms || property.bathrooms || property.parking) && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
            {property.bedrooms && (
              <span className="flex items-center gap-1">
                <Bed className="w-4 h-4" /> {property.bedrooms}
              </span>
            )}
            {property.bathrooms && (
              <span className="flex items-center gap-1">
                <Bath className="w-4 h-4" /> {property.bathrooms}
              </span>
            )}
            {property.parking && (
              <span className="flex items-center gap-1">
                <Car className="w-4 h-4" /> {property.parking}
              </span>
            )}
          </div>
        )}

        <Link to={`/property/${property.id}`} className="block mt-4">
          <Button variant="outline" className="w-full btn-outline" data-testid={`view-details-${property.id}`}>
            View History & Charts
          </Button>
        </Link>
      </div>
    </Card>
  );
};
