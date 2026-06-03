export const DEMO_USER = {
  id: 'demo-1',
  name: 'Carlos Méndez',
  email: 'carlos@empresa.com',
  role: 'admin',
}

export const DEMO_METRICS = {
  contacts: 127,
  companies: 43,
  activeDeals: 31,
  wonDeals: 18,
  revenue: 285000,
  pipeline: 520000,
  pendingTasks: 14,
  overdueTasks: 3,
  activitiesThisMonth: 47,
}

export const DEMO_BY_STAGE = [
  { stage: 'lead',        count: 8  },
  { stage: 'qualified',   count: 9  },
  { stage: 'proposal',    count: 7  },
  { stage: 'negotiation', count: 4  },
  { stage: 'won',         count: 18 },
  { stage: 'lost',        count: 5  },
]

export const DEMO_BY_MONTH = [
  { month: 'Ene', count: 5,  won_count: 2 },
  { month: 'Feb', count: 8,  won_count: 3 },
  { month: 'Mar', count: 11, won_count: 4 },
  { month: 'Abr', count: 9,  won_count: 4 },
  { month: 'May', count: 14, won_count: 6 },
  { month: 'Jun', count: 12, won_count: 5 },
]

export const DEMO_ACTIVITIES = [
  { id: 1, type: 'call',    subject: 'Llamada de seguimiento',        contact_name: 'Ana García',      deal_title: null,              occurred_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: 2, type: 'email',   subject: 'Propuesta enviada por correo',  contact_name: 'Luis Herrera',    deal_title: 'Licencia Enterprise', occurred_at: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
  { id: 3, type: 'meeting', subject: 'Reunión de demo del producto',  contact_name: 'María Torres',    deal_title: null,              occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() },
  { id: 4, type: 'call',    subject: 'Negociación de contrato',       contact_name: 'Pedro Ramírez',   deal_title: 'Plan Pro Anual',  occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString() },
  { id: 5, type: 'email',   subject: 'Onboarding completado',         contact_name: 'Sofia Morales',   deal_title: null,              occurred_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
]

export const DEMO_OVERDUE_TASKS = [
  { id: 1, title: 'Enviar propuesta técnica a cliente',  contact_name: 'Ana García',    due_date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), priority: 'high'   },
  { id: 2, title: 'Coordinar demo con equipo de ventas', contact_name: 'Luis Herrera',  due_date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), priority: 'medium' },
  { id: 3, title: 'Actualizar CRM post-reunión',         contact_name: 'María Torres',  due_date: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),  priority: 'low'    },
]

export const DEMO_CONTACTS = [
  { id: 1,  first_name: 'Ana',     last_name: 'García',    email: 'ana.garcia@techcorp.com',     phone: '+34 600 123 456', job_title: 'Directora de Tecnología', company_name: 'TechCorp S.A.',      status: 'active', source: 'referral',   created_at: '2025-01-15T00:00:00Z' },
  { id: 2,  first_name: 'Luis',    last_name: 'Herrera',   email: 'luis.herrera@innovatech.com', phone: '+34 611 234 567', job_title: 'CEO',                      company_name: 'InnovaTech',         status: 'active', source: 'website',    created_at: '2025-02-03T00:00:00Z' },
  { id: 3,  first_name: 'María',   last_name: 'Torres',    email: 'mtorres@globalinc.com',       phone: '+34 622 345 678', job_title: 'Gerente de Operaciones',   company_name: 'Global Inc.',        status: 'active', source: 'cold_call',  created_at: '2025-02-20T00:00:00Z' },
  { id: 4,  first_name: 'Pedro',   last_name: 'Ramírez',   email: 'pedro@nexusgrowth.com',       phone: '+34 633 456 789', job_title: 'Director Comercial',       company_name: 'Nexus Growth',       status: 'active', source: 'event',      created_at: '2025-03-01T00:00:00Z' },
  { id: 5,  first_name: 'Sofia',   last_name: 'Morales',   email: 'sofia.morales@alphacorp.com', phone: '+34 644 567 890', job_title: 'VP de Ventas',             company_name: 'Alpha Corp',         status: 'active', source: 'linkedin',   created_at: '2025-03-14T00:00:00Z' },
  { id: 6,  first_name: 'Carlos',  last_name: 'Vega',      email: 'cvega@betasolutions.com',     phone: '+34 655 678 901', job_title: 'CTO',                      company_name: 'Beta Solutions',     status: 'active', source: 'referral',   created_at: '2025-03-28T00:00:00Z' },
  { id: 7,  first_name: 'Laura',   last_name: 'Jiménez',   email: 'laura.j@deltagroup.com',      phone: '+34 666 789 012', job_title: 'Directora Financiera',     company_name: 'Delta Group',        status: 'active', source: 'website',    created_at: '2025-04-05T00:00:00Z' },
  { id: 8,  first_name: 'Javier',  last_name: 'Ruiz',      email: 'jruiz@omegadigital.com',      phone: '+34 677 890 123', job_title: 'Head of Marketing',        company_name: 'Omega Digital',      status: 'active', source: 'social',     created_at: '2025-04-18T00:00:00Z' },
  { id: 9,  first_name: 'Carmen',  last_name: 'López',     email: 'carmen.lopez@zenithco.com',   phone: '+34 688 901 234', job_title: 'Gerente de Proyectos',     company_name: 'Zenith Co.',         status: 'active', source: 'event',      created_at: '2025-05-02T00:00:00Z' },
  { id: 10, first_name: 'Miguel',  last_name: 'Castro',    email: 'mcastro@apexventures.com',    phone: '+34 699 012 345', job_title: 'Fundador',                 company_name: 'Apex Ventures',      status: 'active', source: 'referral',   created_at: '2025-05-17T00:00:00Z' },
  { id: 11, first_name: 'Isabel',  last_name: 'Fernández', email: 'ifernandez@primetech.com',    phone: '+34 600 123 789', job_title: 'Product Manager',          company_name: 'PrimeTech',          status: 'active', source: 'cold_call',  created_at: '2025-05-30T00:00:00Z' },
  { id: 12, first_name: 'Roberto', last_name: 'Díaz',      email: 'roberto.diaz@lumosgroup.com', phone: '+34 611 234 890', job_title: 'Director de IT',           company_name: 'Lumos Group',        status: 'inactive', source: 'website',  created_at: '2025-06-10T00:00:00Z' },
]

export const DEMO_DEALS = [
  { id: 1,  title: 'Licencia Enterprise – TechCorp',    value: 48000,  currency: 'USD', stage: 'won',         probability: 100, contact_name: 'Ana García',    company_name: 'TechCorp S.A.',  expected_close: '2025-06-01', created_at: '2025-03-01T00:00:00Z' },
  { id: 2,  title: 'Plan Pro Anual – Nexus Growth',     value: 12000,  currency: 'USD', stage: 'won',         probability: 100, contact_name: 'Pedro Ramírez', company_name: 'Nexus Growth',   expected_close: '2025-05-15', created_at: '2025-03-10T00:00:00Z' },
  { id: 3,  title: 'Integración API – InnovaTech',      value: 35000,  currency: 'USD', stage: 'negotiation', probability: 75,  contact_name: 'Luis Herrera',  company_name: 'InnovaTech',     expected_close: '2026-07-15', created_at: '2025-04-01T00:00:00Z' },
  { id: 4,  title: 'Módulo Analytics – Global Inc.',    value: 22000,  currency: 'USD', stage: 'negotiation', probability: 65,  contact_name: 'María Torres',  company_name: 'Global Inc.',    expected_close: '2026-07-30', created_at: '2025-04-15T00:00:00Z' },
  { id: 5,  title: 'Suite CRM Completa – Alpha Corp',   value: 65000,  currency: 'USD', stage: 'proposal',    probability: 50,  contact_name: 'Sofia Morales', company_name: 'Alpha Corp',     expected_close: '2026-08-20', created_at: '2025-05-01T00:00:00Z' },
  { id: 6,  title: 'Consultoría Setup – Beta Solutions',value: 8500,   currency: 'USD', stage: 'proposal',    probability: 45,  contact_name: 'Carlos Vega',   company_name: 'Beta Solutions', expected_close: '2026-08-10', created_at: '2025-05-10T00:00:00Z' },
  { id: 7,  title: 'Automatización ventas – Delta Group',value: 19000, currency: 'USD', stage: 'proposal',    probability: 40,  contact_name: 'Laura Jiménez', company_name: 'Delta Group',    expected_close: '2026-09-01', created_at: '2025-05-20T00:00:00Z' },
  { id: 8,  title: 'CRM Marketing – Omega Digital',     value: 14500,  currency: 'USD', stage: 'qualified',   probability: 30,  contact_name: 'Javier Ruiz',   company_name: 'Omega Digital',  expected_close: '2026-09-30', created_at: '2025-06-01T00:00:00Z' },
  { id: 9,  title: 'Gestión proyectos – Zenith Co.',    value: 28000,  currency: 'USD', stage: 'qualified',   probability: 25,  contact_name: 'Carmen López',  company_name: 'Zenith Co.',     expected_close: '2026-10-15', created_at: '2025-06-05T00:00:00Z' },
  { id: 10, title: 'Startup Package – Apex Ventures',   value: 5500,   currency: 'USD', stage: 'lead',        probability: 15,  contact_name: 'Miguel Castro',  company_name: 'Apex Ventures',  expected_close: '2026-10-30', created_at: '2025-06-10T00:00:00Z' },
  { id: 11, title: 'Licencia Team – PrimeTech',         value: 9800,   currency: 'USD', stage: 'lead',        probability: 10,  contact_name: 'Isabel Fernández', company_name: 'PrimeTech',   expected_close: '2026-11-01', created_at: '2025-06-12T00:00:00Z' },
]
