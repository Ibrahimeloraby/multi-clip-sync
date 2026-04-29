import type { IndustryTemplate } from "@/types/crm";

export const INDUSTRIES: IndustryTemplate[] = [
  {
    id: "real_estate",
    label: "Real Estate",
    icon: "🏠",
    stakeholders: [
      {
        id: "buyer",
        label: "Buyer",
        color: "bg-blue-500",
        fields: [
          { key: "name", label: "Full Name", type: "text", filterable: false, required: true },
          { key: "phone", label: "Phone", type: "phone", filterable: false, required: true },
          { key: "email", label: "Email", type: "email", filterable: false },
          { key: "budget_min", label: "Min Budget", type: "number", filterable: true },
          { key: "budget_max", label: "Max Budget", type: "number", filterable: true },
          {
            key: "property_type",
            label: "Property Type",
            type: "select",
            options: ["Apartment", "Villa", "Townhouse", "Penthouse", "Land", "Commercial"],
            filterable: true,
          },
          { key: "bedrooms", label: "Bedrooms", type: "select", options: ["Studio", "1", "2", "3", "4", "5+"], filterable: true },
          { key: "location", label: "Preferred Location", type: "text", filterable: true },
          {
            key: "timeline",
            label: "Timeline",
            type: "select",
            options: ["Immediate", "1–3 months", "3–6 months", "6–12 months", "1+ year"],
            filterable: true,
          },
          {
            key: "financing",
            label: "Financing",
            type: "select",
            options: ["Cash", "Mortgage Pre-approved", "Mortgage Pending", "Investor"],
            filterable: true,
          },
          { key: "nationality", label: "Nationality", type: "text", filterable: true },
          { key: "notes", label: "Notes", type: "text", filterable: false },
        ],
        defaultOutreachTemplate:
          "Hi {{name}}, I have some great properties in {{location}} within your budget of {{budget_min}}–{{budget_max}} AED that match your requirements. Are you available for a quick call?",
      },
      {
        id: "seller",
        label: "Seller",
        color: "bg-green-500",
        fields: [
          { key: "name", label: "Full Name", type: "text", filterable: false, required: true },
          { key: "phone", label: "Phone", type: "phone", filterable: false, required: true },
          { key: "email", label: "Email", type: "email", filterable: false },
          { key: "asking_price", label: "Asking Price", type: "number", filterable: true },
          {
            key: "property_type",
            label: "Property Type",
            type: "select",
            options: ["Apartment", "Villa", "Townhouse", "Penthouse", "Land", "Commercial"],
            filterable: true,
          },
          { key: "area_sqft", label: "Area (sqft)", type: "number", filterable: true },
          { key: "bedrooms", label: "Bedrooms", type: "select", options: ["Studio", "1", "2", "3", "4", "5+"], filterable: true },
          { key: "location", label: "Location / Community", type: "text", filterable: true },
          {
            key: "condition",
            label: "Property Condition",
            type: "select",
            options: ["Brand New", "Excellent", "Good", "Needs Renovation"],
            filterable: true,
          },
          {
            key: "timeline",
            label: "Timeline to Sell",
            type: "select",
            options: ["Immediate", "1–3 months", "3–6 months", "Flexible"],
            filterable: true,
          },
          { key: "notes", label: "Notes", type: "text", filterable: false },
        ],
        defaultOutreachTemplate:
          "Hi {{name}}, we have active buyers looking for {{property_type}} in {{location}} around your asking price. Would you be interested in a complimentary valuation?",
      },
      {
        id: "tenant",
        label: "Tenant",
        color: "bg-purple-500",
        fields: [
          { key: "name", label: "Full Name", type: "text", filterable: false, required: true },
          { key: "phone", label: "Phone", type: "phone", filterable: false, required: true },
          { key: "email", label: "Email", type: "email", filterable: false },
          { key: "rent_min", label: "Min Rent (annual)", type: "number", filterable: true },
          { key: "rent_max", label: "Max Rent (annual)", type: "number", filterable: true },
          {
            key: "property_type",
            label: "Property Type",
            type: "select",
            options: ["Apartment", "Villa", "Townhouse", "Studio", "Room", "Commercial"],
            filterable: true,
          },
          { key: "bedrooms", label: "Bedrooms", type: "select", options: ["Studio", "1", "2", "3", "4", "5+"], filterable: true },
          { key: "location", label: "Preferred Location", type: "text", filterable: true },
          { key: "move_in_date", label: "Move-in Date", type: "date", filterable: true },
          {
            key: "lease_term",
            label: "Lease Term",
            type: "select",
            options: ["Monthly", "6 months", "1 year", "2 years"],
            filterable: true,
          },
          {
            key: "furnished",
            label: "Furnished",
            type: "select",
            options: ["Furnished", "Unfurnished", "Either"],
            filterable: true,
          },
          { key: "notes", label: "Notes", type: "text", filterable: false },
        ],
        defaultOutreachTemplate:
          "Hi {{name}}, I have available rentals in {{location}} within your budget of {{rent_min}}–{{rent_max}} AED/year. When are you looking to move in?",
      },
      {
        id: "landlord",
        label: "Landlord",
        color: "bg-orange-500",
        fields: [
          { key: "name", label: "Full Name", type: "text", filterable: false, required: true },
          { key: "phone", label: "Phone", type: "phone", filterable: false, required: true },
          { key: "email", label: "Email", type: "email", filterable: false },
          { key: "asking_rent", label: "Asking Rent (annual)", type: "number", filterable: true },
          {
            key: "property_type",
            label: "Property Type",
            type: "select",
            options: ["Apartment", "Villa", "Townhouse", "Studio", "Commercial"],
            filterable: true,
          },
          { key: "bedrooms", label: "Bedrooms", type: "select", options: ["Studio", "1", "2", "3", "4", "5+"], filterable: true },
          { key: "location", label: "Location", type: "text", filterable: true },
          { key: "available_from", label: "Available From", type: "date", filterable: true },
          { key: "units_count", label: "No. of Units", type: "number", filterable: true },
          { key: "notes", label: "Notes", type: "text", filterable: false },
        ],
        defaultOutreachTemplate:
          "Hi {{name}}, we have qualified tenants looking for {{property_type}} in {{location}}. We can help fill your unit quickly — interested?",
      },
    ],
  },

  {
    id: "insurance",
    label: "Insurance",
    icon: "🛡️",
    stakeholders: [
      {
        id: "lead",
        label: "New Lead",
        color: "bg-blue-500",
        fields: [
          { key: "name", label: "Full Name", type: "text", filterable: false, required: true },
          { key: "phone", label: "Phone", type: "phone", filterable: false, required: true },
          { key: "email", label: "Email", type: "email", filterable: false },
          { key: "age", label: "Age", type: "number", filterable: true },
          {
            key: "policy_type",
            label: "Policy Type",
            type: "select",
            options: ["Life", "Health", "Auto", "Home", "Travel", "Business", "Other"],
            filterable: true,
          },
          { key: "coverage_amount", label: "Coverage Amount", type: "number", filterable: true },
          { key: "premium_budget", label: "Monthly Budget", type: "number", filterable: true },
          { key: "occupation", label: "Occupation", type: "text", filterable: true },
          { key: "location", label: "Emirate / City", type: "text", filterable: true },
          {
            key: "current_insurer",
            label: "Current Insurer",
            type: "text",
            filterable: true,
          },
          { key: "notes", label: "Notes", type: "text", filterable: false },
        ],
        defaultOutreachTemplate:
          "Hi {{name}}, based on your profile I have a tailored {{policy_type}} insurance plan within your budget. Can we schedule a quick review?",
      },
      {
        id: "renewal",
        label: "Renewal",
        color: "bg-yellow-500",
        fields: [
          { key: "name", label: "Full Name", type: "text", filterable: false, required: true },
          { key: "phone", label: "Phone", type: "phone", filterable: false, required: true },
          { key: "email", label: "Email", type: "email", filterable: false },
          {
            key: "policy_type",
            label: "Policy Type",
            type: "select",
            options: ["Life", "Health", "Auto", "Home", "Travel", "Business"],
            filterable: true,
          },
          { key: "policy_number", label: "Policy Number", type: "text", filterable: false },
          { key: "renewal_date", label: "Renewal Date", type: "date", filterable: true },
          { key: "current_premium", label: "Current Premium", type: "number", filterable: true },
          {
            key: "satisfaction",
            label: "Satisfaction",
            type: "select",
            options: ["Very Happy", "Neutral", "Looking to Switch"],
            filterable: true,
          },
          { key: "notes", label: "Notes", type: "text", filterable: false },
        ],
        defaultOutreachTemplate:
          "Hi {{name}}, your {{policy_type}} policy renews soon. I have better rates available — worth a 5-minute comparison call?",
      },
    ],
  },

  {
    id: "automotive",
    label: "Automotive",
    icon: "🚗",
    stakeholders: [
      {
        id: "buyer",
        label: "Buyer",
        color: "bg-blue-500",
        fields: [
          { key: "name", label: "Full Name", type: "text", filterable: false, required: true },
          { key: "phone", label: "Phone", type: "phone", filterable: false, required: true },
          { key: "email", label: "Email", type: "email", filterable: false },
          { key: "budget_min", label: "Min Budget", type: "number", filterable: true },
          { key: "budget_max", label: "Max Budget", type: "number", filterable: true },
          { key: "make_preference", label: "Make Preference", type: "text", filterable: true },
          { key: "model_preference", label: "Model Preference", type: "text", filterable: true },
          {
            key: "body_type",
            label: "Body Type",
            type: "select",
            options: ["Sedan", "SUV", "Hatchback", "Coupe", "Pickup", "Van"],
            filterable: true,
          },
          {
            key: "purchase_type",
            label: "Purchase Type",
            type: "select",
            options: ["Cash", "Finance", "Lease"],
            filterable: true,
          },
          {
            key: "has_trade_in",
            label: "Trade-In",
            type: "select",
            options: ["Yes", "No"],
            filterable: true,
          },
          {
            key: "timeline",
            label: "Timeline",
            type: "select",
            options: ["This week", "This month", "1–3 months", "Just browsing"],
            filterable: true,
          },
          { key: "notes", label: "Notes", type: "text", filterable: false },
        ],
        defaultOutreachTemplate:
          "Hi {{name}}, I have a great {{make_preference}} {{model_preference}} in stock within your budget. Interested in a test drive this week?",
      },
      {
        id: "trade_in",
        label: "Trade-In",
        color: "bg-orange-500",
        fields: [
          { key: "name", label: "Full Name", type: "text", filterable: false, required: true },
          { key: "phone", label: "Phone", type: "phone", filterable: false, required: true },
          { key: "current_make", label: "Current Make", type: "text", filterable: true },
          { key: "current_model", label: "Current Model", type: "text", filterable: true },
          { key: "year", label: "Year", type: "number", filterable: true },
          { key: "mileage_km", label: "Mileage (km)", type: "number", filterable: true },
          {
            key: "condition",
            label: "Condition",
            type: "select",
            options: ["Excellent", "Good", "Fair", "Needs Work"],
            filterable: true,
          },
          { key: "expected_value", label: "Expected Trade-in Value", type: "number", filterable: true },
          { key: "notes", label: "Notes", type: "text", filterable: false },
        ],
        defaultOutreachTemplate:
          "Hi {{name}}, we'd love to offer you a valuation for your {{year}} {{current_make}} {{current_model}}. Can we arrange an inspection?",
      },
    ],
  },

  {
    id: "recruitment",
    label: "Recruitment",
    icon: "👔",
    stakeholders: [
      {
        id: "candidate",
        label: "Candidate",
        color: "bg-blue-500",
        fields: [
          { key: "name", label: "Full Name", type: "text", filterable: false, required: true },
          { key: "phone", label: "Phone", type: "phone", filterable: false, required: true },
          { key: "email", label: "Email", type: "email", filterable: false },
          { key: "job_title", label: "Current Job Title", type: "text", filterable: true },
          { key: "industry", label: "Industry", type: "text", filterable: true },
          { key: "experience_years", label: "Years of Experience", type: "number", filterable: true },
          { key: "current_salary", label: "Current Salary (AED)", type: "number", filterable: true },
          { key: "expected_salary", label: "Expected Salary (AED)", type: "number", filterable: true },
          { key: "skills", label: "Key Skills", type: "text", filterable: true },
          {
            key: "notice_period",
            label: "Notice Period",
            type: "select",
            options: ["Immediate", "2 weeks", "1 month", "3 months"],
            filterable: true,
          },
          { key: "location", label: "Current Location", type: "text", filterable: true },
          {
            key: "visa_status",
            label: "Visa Status",
            type: "select",
            options: ["Citizen", "Resident", "Employment Visa", "Visit Visa", "Requires Sponsorship"],
            filterable: true,
          },
          { key: "notes", label: "Notes", type: "text", filterable: false },
        ],
        defaultOutreachTemplate:
          "Hi {{name}}, I have an exciting {{job_title}} opportunity that matches your background in {{industry}}. Would you be open to a confidential discussion?",
      },
      {
        id: "client_company",
        label: "Client Company",
        color: "bg-green-500",
        fields: [
          { key: "company_name", label: "Company Name", type: "text", filterable: false, required: true },
          { key: "contact_name", label: "Contact Name", type: "text", filterable: false },
          { key: "phone", label: "Phone", type: "phone", filterable: false, required: true },
          { key: "email", label: "Email", type: "email", filterable: false },
          { key: "industry", label: "Industry", type: "text", filterable: true },
          { key: "headcount", label: "Company Size", type: "number", filterable: true },
          { key: "role_type", label: "Role Hiring For", type: "text", filterable: true },
          { key: "salary_budget", label: "Salary Budget (AED)", type: "number", filterable: true },
          { key: "start_date", label: "Target Start Date", type: "date", filterable: true },
          {
            key: "urgency",
            label: "Urgency",
            type: "select",
            options: ["ASAP", "1 month", "1–3 months", "Ongoing"],
            filterable: true,
          },
          { key: "notes", label: "Notes", type: "text", filterable: false },
        ],
        defaultOutreachTemplate:
          "Hi {{contact_name}}, we have pre-screened candidates for the {{role_type}} position at {{company_name}}. When would be a good time to share profiles?",
      },
    ],
  },
];

export function getIndustry(id: string): IndustryTemplate | undefined {
  return INDUSTRIES.find((i) => i.id === id);
}

export function getStakeholder(industryId: string, stakeholderId: string) {
  return getIndustry(industryId)?.stakeholders.find((s) => s.id === stakeholderId);
}
