import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Search,
  Home,
  Building2,
  DollarSign,
  Wallet,
  PiggyBank,
  AlertTriangle,
  CheckCircle,
  BarChart3,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { PropertyCard } from "@/components/PropertyCard";
import { API } from "@/App";

export const PortfolioDashboard = () => {
  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState(null);
  const [portfolioHistory, setPortfolioHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");

  const fetchProperties = useCallback(async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (propertyTypeFilter !== "all") params.property_type = propertyTypeFilter;

      const response = await axios.get(`${API}/properties`, { params });
      setProperties(response.data);
    } catch (error) {
      toast.error("Failed to fetch properties");
    }
  }, [searchTerm, propertyTypeFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/portfolio/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  const fetchPortfolioHistory = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/portfolio/history`, { params: { days: 90 } });
      setPortfolioHistory(response.data.map(h => ({
        ...h,
        date: new Date(h.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
      })));
    } catch (error) {
      console.error("Failed to fetch portfolio history:", error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProperties(), fetchStats(), fetchPortfolioHistory()]);
      setLoading(false);
    };
    loadData();
  }, [fetchProperties, fetchStats, fetchPortfolioHistory]);

  const seedDemoData = async () => {
    try {
      await axios.post(`${API}/demo/seed`);
      toast.success("Demo data loaded!");
      await Promise.all([fetchProperties(), fetchStats(), fetchPortfolioHistory()]);
    } catch (error) {
      toast.error("Failed to load demo data");
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatShortCurrency = (value) => {
    if (!value) return "$0";
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const investmentProperties = properties.filter(p => p.property_type === "investment");
  const pporProperties = properties.filter(p => p.property_type === "ppor");

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 md:p-12">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2 font-serif" data-testid="dashboard-title">
              Property Portfolio
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage and track your Australian property investments
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={seedDemoData} variant="outline" className="btn-outline" data-testid="seed-demo-btn">
              Load Demo Data
            </Button>
            <Link to="/add">
              <Button className="btn-primary" data-testid="add-property-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="investments" data-testid="tab-investments">Investments</TabsTrigger>
          <TabsTrigger value="ppor" data-testid="tab-ppor">PPOR</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          {/* Portfolio Stats - ALL Properties for Value, Investment Only for Cash Flow */}
          <div className="mb-8">
            <h2 className="text-xl font-serif font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Portfolio Summary
              <span className="text-xs font-normal text-muted-foreground ml-2">(All Properties)</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="portfolio-stats">
              <Card className="stat-card">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Properties</span>
                </div>
                <p className="font-serif text-2xl" data-testid="stat-count">
                  {loading ? <Skeleton className="h-8 w-16" /> : `${stats?.investment_count || 0} / ${stats?.total_properties || 0}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Investment / Total</p>
              </Card>

              <Card className="stat-card">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-accent/20">
                    <DollarSign className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Total Value</span>
                </div>
                <p className="font-serif text-2xl" data-testid="stat-total-value">
                  {loading ? <Skeleton className="h-8 w-24" /> : formatCurrency(stats?.total_property_value)}
                </p>
              </Card>

              <Card className="stat-card">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <Wallet className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Total Loans</span>
                </div>
                <p className="font-serif text-2xl" data-testid="stat-total-loans">
                  {loading ? <Skeleton className="h-8 w-24" /> : formatCurrency(stats?.total_outstanding_loans)}
                </p>
              </Card>

              <Card className="stat-card">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <PiggyBank className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Net Value</span>
                </div>
                <p className="font-serif text-2xl text-emerald-600" data-testid="stat-net-value">
                  {loading ? <Skeleton className="h-8 w-24" /> : formatCurrency(stats?.total_net_value)}
                </p>
              </Card>
            </div>
          </div>

          {/* Cash Flow Summary - Investment Properties Only */}
          <div className="mb-8">
            <h2 className="text-xl font-serif font-semibold mb-4">
              Annual Cash Flow Summary
              <span className="text-xs font-normal text-muted-foreground ml-2">(Investment Properties Only)</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Rental Income</p>
                <p className="font-serif text-xl text-emerald-600" data-testid="stat-rental">
                  {formatCurrency(stats?.total_annual_rental_income)}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Loan Repayments</p>
                <p className="font-serif text-xl text-red-500" data-testid="stat-repayments">
                  {formatCurrency(stats?.total_annual_loan_repayments)}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Expenses</p>
                <p className="font-serif text-xl text-orange-500" data-testid="stat-expenses">
                  {formatCurrency(stats?.total_annual_expenses)}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  {stats?.is_cash_flow_positive ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Monthly {stats?.is_cash_flow_positive ? "Surplus" : "Shortage"}
                  </p>
                </div>
                <p className={`font-serif text-xl ${stats?.is_cash_flow_positive ? 'text-emerald-600' : 'text-red-500'}`} data-testid="stat-monthly-cashflow">
                  {formatCurrency(Math.abs((stats?.overall_yearly_shortage || 0) / 12))}
                  <span className="text-xs font-sans ml-1">/month</span>
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  {stats?.is_cash_flow_positive ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Yearly {stats?.is_cash_flow_positive ? "Surplus" : "Shortage"}
                  </p>
                </div>
                <p className={`font-serif text-xl ${stats?.is_cash_flow_positive ? 'text-emerald-600' : 'text-red-500'}`} data-testid="stat-cashflow">
                  {formatCurrency(Math.abs(stats?.overall_yearly_shortage || 0))}
                  <span className="text-xs font-sans ml-1">/year</span>
                </p>
              </Card>
            </div>
          </div>

          {/* Portfolio Chart */}
          {portfolioHistory.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="font-serif">Portfolio Value Trend (All Properties)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]" data-testid="portfolio-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={portfolioHistory}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(153, 26%, 25%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(153, 26%, 25%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorLoan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(153, 50%, 50%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(153, 50%, 50%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(45, 14%, 86%)" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={formatShortCurrency} tick={{ fontSize: 12 }} width={70} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area type="monotone" dataKey="total_value" name="Total Value" stroke="hsl(153, 26%, 25%)" fill="url(#colorValue)" strokeWidth={2} />
                      <Area type="monotone" dataKey="total_loan" name="Total Loans" stroke="hsl(0, 84%, 60%)" fill="url(#colorLoan)" strokeWidth={2} />
                      <Area type="monotone" dataKey="total_net" name="Net Value" stroke="hsl(153, 50%, 50%)" fill="url(#colorNet)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Properties Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-serif font-semibold">All Properties</h2>
              <div className="flex gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9"
                    data-testid="search-input"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="properties-grid">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="property-card">
                    <Skeleton className="aspect-[4/3] w-full" />
                    <div className="p-6 space-y-4">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-10 w-1/2" />
                    </div>
                  </Card>
                ))
              ) : properties.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <Home className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-xl font-serif font-medium mb-2">No properties yet</h3>
                  <p className="text-muted-foreground mb-6">Add a property or load demo data to get started</p>
                </div>
              ) : (
                properties.map((property, index) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onUpdate={() => {
                      fetchProperties();
                      fetchStats();
                    }}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  />
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* Investments Tab */}
        <TabsContent value="investments" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {investmentProperties.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <Building2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-serif font-medium mb-2">No investment properties</h3>
                <Link to="/add"><Button className="btn-primary">Add Investment Property</Button></Link>
              </div>
            ) : (
              investmentProperties.map((property, index) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onUpdate={() => { fetchProperties(); fetchStats(); }}
                  style={{ animationDelay: `${index * 0.1}s` }}
                />
              ))
            )}
          </div>
        </TabsContent>

        {/* PPOR Tab */}
        <TabsContent value="ppor" className="mt-6">
          <div className="mb-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Home className="w-4 h-4" />
              PPOR (Primary Place of Residence) properties are excluded from portfolio analytics and charts.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {pporProperties.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <Home className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-serif font-medium mb-2">No PPOR properties</h3>
                <Link to="/add"><Button className="btn-primary">Add PPOR Property</Button></Link>
              </div>
            ) : (
              pporProperties.map((property, index) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onUpdate={() => { fetchProperties(); fetchStats(); }}
                  style={{ animationDelay: `${index * 0.1}s` }}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
