"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Filter, Download, Upload, Building2,
  Eye, ChevronLeft, MapPin, Phone, Mail, CalendarClock, X, Copy, CheckCheck,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Paginate from "@/components/Paginate";
import StatsCard from "@/components/StatsCard";
import ReusableForm from "@/components/ReusableForm";
import DataTable from "@/components/DataTable";
import { FieldConfig } from "@/components/ReusableForm";


// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

type CompanyAsset = {
  id: number
  designation: string
  codification: string
  status: string
  criticite?: string
  valeur_entree?: number
  date_entree?: string
  description?: string
  type?: { id:number,name:string }
  subType?: { id:number,name:string }
  site?: { nom:string }
}


// ═══════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════

const STATIC_TYPES = [
  { id: 1, name: "Infrastructure" },
  { id: 2, name: "Équipement" },
]

const STATIC_SUB_TYPES = [
  { id: 1, name: "Climatisation", type_company_asset_id: 2 },
  { id: 2, name: "Groupe électrogène", type_company_asset_id: 2 },
  { id: 3, name: "Bâtiment", type_company_asset_id: 1 },
]

const STATIC_SITE = {
  id:1,
  nom:"Siège Abidjan",
  localisation:"Plateaux, Abidjan",
  manager:{
    name:"Kouassi Jean",
    phone:"+2250700000000",
    email:"manager@company.com"
  }
}

const STATIC_STATS = {
  tickets_en_cours:4,
  tickets_clos:18,
  cout_loyer_moyen:450000
}

const STATIC_ASSETS:CompanyAsset[] = [

  {
    id:1,
    designation:"Climatiseur Salle Serveur",
    codification:"CLIM-001",
    status:"actif",
    criticite:"critique",
    valeur_entree:850000,
    date_entree:"2024-01-12",
    description:"Climatiseur principal du data room",
    type:{id:2,name:"Équipement"},
    subType:{id:1,name:"Climatisation"},
    site:{nom:"Siège Abidjan"}
  },

  {
    id:2,
    designation:"Groupe électrogène principal",
    codification:"GEN-001",
    status:"actif",
    criticite:"critique",
    valeur_entree:12000000,
    date_entree:"2023-06-15",
    description:"Groupe électrogène 150KVA",
    type:{id:2,name:"Équipement"},
    subType:{id:2,name:"Groupe électrogène"},
    site:{nom:"Siège Abidjan"}
  }

]


// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

const formatMontant=(v?:number|null)=>{
  if(!v && v!==0) return "—"
  if(v>=1_000_000) return `${(v/1_000_000).toFixed(1)}M FCFA`
  if(v>=1_000) return `${(v/1_000).toFixed(1)}K FCFA`
  return `${v} FCFA`
}

const formatDate=(iso?:string|null)=>{
  if(!iso) return "—"
  const d=new Date(iso)
  if(isNaN(d.getTime())) return iso
  return d.toLocaleDateString("fr-FR")
}


// ═══════════════════════════════════════════════
// COPY BUTTON
// ═══════════════════════════════════════════════

function CopyButton({text}:{text:string}){

  const [copied,setCopied]=useState(false)

  return(
    <button
      onClick={async()=>{
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(()=>setCopied(false),2000)
      }}
      className="ml-2 p-1 rounded-lg hover:bg-slate-200 transition text-slate-400 hover:text-slate-700"
    >
      {copied ? <CheckCheck size={13}/> : <Copy size={13}/>}
    </button>
  )
}


// ═══════════════════════════════════════════════
// STATUS
// ═══════════════════════════════════════════════

const STATUS_STYLE={
  actif:"border-green-500 bg-green-50 text-green-700",
  inactif:"border-red-400 bg-red-50 text-red-600",
  hors_usage:"border-slate-400 bg-slate-100 text-slate-700"
}


// ═══════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════

const PER_PAGE=10

export default function SiteDetailsPage(){

  const params=useParams()
  const siteId=Number(params?.id)

  const types=STATIC_TYPES
  const subTypes=STATIC_SUB_TYPES

  const [site,setSite]=useState<any>(null)
  const [stats,setStats]=useState<any>(null)

  const [patrimoines,setPatrimoines]=useState<CompanyAsset[]>([])
  const [loading,setLoading]=useState(true)

  const [currentPage,setCurrentPage]=useState(1)

  const [isModalOpen,setIsModalOpen]=useState(false)
  const [editingData,setEditingData]=useState<CompanyAsset|null>(null)

  const [selected,setSelected]=useState<CompanyAsset|null>(null)

  const filterRef=useRef<HTMLDivElement>(null)


  // load mock
  useEffect(()=>{
    setSite(STATIC_SITE)
    setStats(STATIC_STATS)
    setPatrimoines(STATIC_ASSETS)
    setLoading(false)
  },[])



  // pagination

  const totalPages=Math.ceil(patrimoines.length/PER_PAGE)||1

  const paginated=patrimoines.slice(
    (currentPage-1)*PER_PAGE,
    currentPage*PER_PAGE
  )



  // create/update mock

  const handleCreateOrUpdate=(formData:any)=>{

    if(editingData){

      const updated=patrimoines.map(a=>
        a.id===editingData.id ? {...a,...formData} : a
      )

      setPatrimoines(updated)

    }else{

      const newAsset:CompanyAsset={
        id:patrimoines.length+1,
        codification:"AUTO-"+Date.now(),
        designation:formData.designation,
        status:formData.status,
        criticite:formData.criticite,
        valeur_entree:formData.valeur_entree,
        date_entree:formData.date_entree,
        description:formData.description,
        type:types.find(t=>t.id===Number(formData.type_company_asset_id)),
        subType:subTypes.find(s=>s.id===Number(formData.sub_type_company_asset_id)),
        site:{nom:site.nom}
      }

      setPatrimoines([...patrimoines,newAsset])
    }

    setIsModalOpen(false)
    setEditingData(null)
  }



  // table columns

  const columns=[

    {
      header:"ID",
      key:"id",
      render:(_:any,row:CompanyAsset)=>(
        <div className="flex items-center">
          <span className="font-black text-sm">#{row.id}</span>
          <CopyButton text={String(row.id)}/>
        </div>
      )
    },

    {
      header:"Type",
      key:"type",
      render:(_:any,row:CompanyAsset)=>row.type?.name
    },

    {
      header:"Sous-type",
      key:"subType",
      render:(_:any,row:CompanyAsset)=>row.subType?.name
    },

    {
      header:"Codification",
      key:"codification",
      render:(_:any,row:CompanyAsset)=>(
        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
          {row.codification}
        </span>
      )
    },

    {
      header:"Désignation",
      key:"designation",
      render:(_:any,row:CompanyAsset)=>row.designation
    },

    {
      header:"Statut",
      key:"status",
      render:(_:any,row:CompanyAsset)=>(
        <span className={`px-3 py-1 rounded border text-xs font-bold ${STATUS_STYLE[row.status]}`}>
          {row.status}
        </span>
      )
    },

    {
      header:"Date entrée",
      key:"date",
      render:(_:any,row:CompanyAsset)=>formatDate(row.date_entree)
    },

    {
      header:"Valeur",
      key:"valeur",
      render:(_:any,row:CompanyAsset)=>formatMontant(row.valeur_entree)
    },

    {
      header:"Actions",
      key:"actions",
      render:(_:any,row:CompanyAsset)=>(
        <button
          onClick={()=>setSelected(row)}
          className="flex items-center gap-2 font-bold text-slate-800"
        >
          <Eye size={18}/> Aperçu
        </button>
      )
    }

  ]



  const assetFields:FieldConfig[]=[

    {
      name:"type_company_asset_id",
      label:"Famille / Type",
      type:"select",
      required:true,
      options:types.map(t=>({label:t.name,value:String(t.id)}))
    },

    {
      name:"sub_type_company_asset_id",
      label:"Sous-type",
      type:"select",
      required:true,
      options:subTypes.map(s=>({label:s.name,value:String(s.id)}))
    },

    {name:"designation",label:"Désignation",type:"text",required:true},

    {
      name:"status",
      label:"Statut",
      type:"select",
      required:true,
      options:[
        {label:"Actif",value:"actif"},
        {label:"Inactif",value:"inactif"},
        {label:"Hors usage",value:"hors_usage"}
      ]
    },

    {name:"date_entree",label:"Date entrée",type:"date",required:true,icon:CalendarClock},

    {name:"valeur_entree",label:"Valeur entrée",type:"number",required:true},

    {name:"description",label:"Description",type:"rich-text",gridSpan:2}

  ]



  return(

    <div className="flex min-h-screen bg-gray-50">

      <Sidebar/>

      <div className="flex-1 flex flex-col pl-64">

        <Navbar/>

        <main className="mt-20 p-8 space-y-8">


          {/* header */}

          <div className="bg-white flex justify-between p-6 rounded-2xl border">

            <div>

              <Link href="/admin/sites"
                className="flex items-center gap-2 text-slate-500 text-sm mb-3"
              >
                <ChevronLeft size={18}/> Retour
              </Link>

              <h1 className="text-5xl font-black uppercase">
                {site?.nom}
              </h1>

              <div className="flex items-center gap-2 text-slate-400 mt-1">
                <MapPin size={18}/>
                {site?.localisation}
              </div>

            </div>


            <div className="bg-slate-50 p-6 rounded-xl border min-w-[280px]">

              <h3 className="font-bold text-lg">
                {site?.manager?.name}
              </h3>

              <div className="flex gap-2 mt-2">
                <Phone size={16}/> {site?.manager?.phone}
              </div>

              <div className="flex gap-2 mt-1">
                <Mail size={16}/> {site?.manager?.email}
              </div>

            </div>

          </div>



          {/* stats */}

          <div className="grid grid-cols-4 gap-6">

            <StatsCard label="Coût moyen / site" value={formatMontant(stats?.cout_loyer_moyen)} delta="+0%" trend="up"/>

            <StatsCard label="Tickets en cours" value={stats?.tickets_en_cours ?? 0} delta="+0%" trend="up"/>

            <StatsCard label="Tickets clôturés" value={stats?.tickets_clos ?? 0} delta="+0%" trend="up"/>

            <StatsCard label="Total patrimoines" value={patrimoines.length} delta="+0%" trend="up"/>

          </div>



          {/* actions */}

          <div className="flex justify-end gap-3">

            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl border"
            >
              <Download size={16}/> Importer
            </button>

            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl border"
            >
              <Upload size={16}/> Exporter
            </button>

            <button
              onClick={()=>{setEditingData(null);setIsModalOpen(true)}}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white"
            >
              <Building2 size={16}/> Ajouter un patrimoine
            </button>

          </div>



          {/* table */}

          <div className="bg-white rounded-3xl border overflow-hidden">

            <DataTable
              columns={columns}
              data={paginated}
              title="Patrimoines du site"
              onViewAll={()=>{}}
            />

            <div className="p-6 border-t flex justify-between">

              <p className="text-xs text-slate-400">
                Page {currentPage} sur {totalPages}
              </p>

              <Paginate
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />

            </div>

          </div>

        </main>

      </div>



      <ReusableForm
        isOpen={isModalOpen}
        onClose={()=>{setIsModalOpen(false);setEditingData(null)}}
        title={editingData ? "Modifier le patrimoine":"Ajouter un patrimoine"}
        subtitle="Renseignez les informations"
        fields={assetFields}
        initialValues={editingData ?? {}}
        onSubmit={handleCreateOrUpdate}
        submitLabel={editingData ? "Mettre à jour":"Enregistrer"}
      />

    </div>
  )
}