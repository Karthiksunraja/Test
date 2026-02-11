import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Link as LinkIcon, PenLine, Building2, Home } from "lucide-react";
import { API } from "@/App";

export const AddProperty = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [addMethod, setAddMethod] = useState("manual");
  
  const [formData, setFormData] = useState({
    url: "",
    nickname: "",
    address: "",
    suburb: "",
    state: "",
    postcode: "",
    property_type: "investment",
    current_value: "",
    outstanding_loan: "",
    monthly_loan_repayment: "",
    rent_amount: "",
    rent_frequency: "monthly",
    yearly_expenses: "",
    bedrooms: "",
    bathrooms: "",
    parking: "",
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (addMethod === "url" && !formData.url) {
      toast.error("Please enter a property URL");
      return;
    }
    
    if (addMethod === "manual" && !formData.address) {
      toast.error("Please enter a property address");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        property_type: formData.property_type,
        nickname: formData.nickname || null,
      };

      if (addMethod === "url") {
        payload.url = formData.url;
      } else {
        payload.address = formData.address;
        payload.suburb = formData.suburb || null;
        payload.state = formData.state || null;
        payload.postcode = formData.postcode || null;
      }

      // Add financial details if provided
      if (formData.current_value) payload.current_value = parseFloat(formData.current_value);
      if (formData.outstanding_loan) payload.outstanding_loan = parseFloat(formData.outstanding_loan);
      if (formData.monthly_loan_repayment) payload.monthly_loan_repayment = parseFloat(formData.monthly_loan_repayment);
      if (formData.rent_amount) payload.rent_amount = parseFloat(formData.rent_amount);
      payload.rent_frequency = formData.rent_frequency;
      if (formData.yearly_expenses) payload.yearly_expenses = parseFloat(formData.yearly_expenses);

      await axios.post(`${API}/properties`, payload);
      toast.success("Property added successfully!");
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add property");
    } finally {
      setLoading(false);
    }
  };

  const isInvestment = formData.property_type === "investment";

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-12">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        data-testid="back-link"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Add New Property</CardTitle>
          <CardDescription>
            Add a property via URL from property.com.au or enter details manually
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Property Type Selection */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">Property Type *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleChange("property_type", "investment")}
                  className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    formData.property_type === "investment"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                  data-testid="type-investment"
                >
                  <Building2 className={`w-6 h-6 ${formData.property_type === "investment" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-medium">Investment</span>
                  <span className="text-xs text-muted-foreground">Included in portfolio analytics</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleChange("property_type", "ppor")}
                  className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    formData.property_type === "ppor"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                  data-testid="type-ppor"
                >
                  <Home className={`w-6 h-6 ${formData.property_type === "ppor" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-medium">PPOR</span>
                  <span className="text-xs text-muted-foreground">Primary residence</span>
                </button>
              </div>
            </div>

            {/* Add Method Tabs */}
            <Tabs value={addMethod} onValueChange={setAddMethod}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <PenLine className="w-4 h-4" />
                  Manual Entry
                </TabsTrigger>
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  From URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="space-y-4 mt-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider">Property URL *</Label>
                  <Input
                    placeholder="https://www.property.com.au/..."
                    value={formData.url}
                    onChange={(e) => handleChange("url", e.target.value)}
                    data-testid="url-input"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste a property listing URL from property.com.au
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4 mt-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider">Address *</Label>
                  <Input
                    placeholder="e.g., 123 Main Street, Sydney NSW 2000"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    data-testid="address-input"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs uppercase tracking-wider">Suburb</Label>
                    <Input
                      placeholder="Sydney"
                      value={formData.suburb}
                      onChange={(e) => handleChange("suburb", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider">State</Label>
                    <Select value={formData.state} onValueChange={(v) => handleChange("state", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NSW">NSW</SelectItem>
                        <SelectItem value="VIC">VIC</SelectItem>
                        <SelectItem value="QLD">QLD</SelectItem>
                        <SelectItem value="WA">WA</SelectItem>
                        <SelectItem value="SA">SA</SelectItem>
                        <SelectItem value="TAS">TAS</SelectItem>
                        <SelectItem value="NT">NT</SelectItem>
                        <SelectItem value="ACT">ACT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider">Postcode</Label>
                    <Input
                      placeholder="2000"
                      value={formData.postcode}
                      onChange={(e) => handleChange("postcode", e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Nickname */}
            <div>
              <Label className="text-xs uppercase tracking-wider">Nickname (Optional)</Label>
              <Input
                placeholder="e.g., Beach House, City Apartment"
                value={formData.nickname}
                onChange={(e) => handleChange("nickname", e.target.value)}
                data-testid="nickname-input"
              />
            </div>

            {/* Value & Loan Section */}
            <div className="border-t border-border pt-6">
              <h3 className="font-serif font-medium mb-4">Value & Loan Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider">Property Value ($)</Label>
                  <Input
                    type="number"
                    placeholder="750000"
                    value={formData.current_value}
                    onChange={(e) => handleChange("current_value", e.target.value)}
                    data-testid="value-input"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Outstanding Loan ($)</Label>
                  <Input
                    type="number"
                    placeholder="500000"
                    value={formData.outstanding_loan}
                    onChange={(e) => handleChange("outstanding_loan", e.target.value)}
                    data-testid="loan-input"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs uppercase tracking-wider">Monthly Loan Repayment ($)</Label>
                  <Input
                    type="number"
                    placeholder="3000"
                    value={formData.monthly_loan_repayment}
                    onChange={(e) => handleChange("monthly_loan_repayment", e.target.value)}
                    data-testid="repayment-input"
                  />
                </div>
              </div>
            </div>

            {/* Rental Section - Only for Investment */}
            {isInvestment && (
              <div className="border-t border-border pt-6">
                <h3 className="font-serif font-medium mb-4">Rental & Expenses</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs uppercase tracking-wider">Rent Amount ($)</Label>
                    <Input
                      type="number"
                      placeholder="2500"
                      value={formData.rent_amount}
                      onChange={(e) => handleChange("rent_amount", e.target.value)}
                      data-testid="rent-input"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider">Rent Frequency</Label>
                    <Select value={formData.rent_frequency} onValueChange={(v) => handleChange("rent_frequency", v)}>
                      <SelectTrigger data-testid="frequency-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs uppercase tracking-wider">Yearly Expenses ($)</Label>
                    <Input
                      type="number"
                      placeholder="8000"
                      value={formData.yearly_expenses}
                      onChange={(e) => handleChange("yearly_expenses", e.target.value)}
                      data-testid="expenses-input"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Include maintenance, insurance, management fees, council rates, etc.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/")}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 btn-primary" disabled={loading} data-testid="submit-btn">
                {loading ? "Adding..." : "Add Property"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
