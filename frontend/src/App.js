import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { PortfolioDashboard } from "@/components/PortfolioDashboard";
import { PropertyDetail } from "@/components/PropertyDetail";
import { AddProperty } from "@/components/AddProperty";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

function App() {
  return (
    <div className="min-h-screen bg-background">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PortfolioDashboard />} />
          <Route path="/property/:id" element={<PropertyDetail />} />
          <Route path="/add" element={<AddProperty />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

export default App;
