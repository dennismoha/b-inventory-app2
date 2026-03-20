import React, { useState } from 'react';
import { User, ChevronRight, Package, ArrowUpRight } from 'lucide-react';

const PremiumReceivableUI = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const data = [
    {
      receivableId: 'cmmxe1rfh0002enu60nn11gsq',
      transactionId: 'c596ef3b-9a24-46ac-9618-118f80556eb5',
      transactionDate: '2026-03-19T11:30:02.094Z',
      customer: {
        id: 'bc520a51-2437-45fc-b588-47896a0beda6',
        name: 'beatrice Kany',
        preferredPaymentMethod: 'card'
      },
      totals: {
        totalAmount: 400,
        totalPaid: 0,
        balanceDue: 400
      },
      sales: [
        {
          productName: 'AnimalNutra Co. - Dog Food - Adult Formula',
          quantity: 2,
          price: 200,
          subTotal: 400,
          discount: 0,
          vat: 0,
          total: 400
        }
      ]
    },
    {
      receivableId: 'cmmxh18b100025yj7kgt15fsj',
      transactionId: 'f32be583-a3de-453a-8aa9-e33b9db77998',
      transactionDate: '2026-03-19T12:53:36.188Z',
      customer: {
        id: 'bc520a51-2437-45fc-b588-47896a0beda6',
        name: 'beatrice Kany',
        preferredPaymentMethod: 'card'
      },
      totals: {
        totalAmount: 690,
        totalPaid: 0,
        balanceDue: 690
      },
      sales: [
        {
          productName: 'AnimalNutra Co. - Dog Food - Adult Formula',
          quantity: 3,
          price: 200,
          subTotal: 600,
          discount: 0,
          vat: 0,
          total: 600
        },
        {
          productName: 'FarmFeed Suppliers - Premium Cattle Feed',
          quantity: 3,
          price: 30,
          subTotal: 90,
          discount: 0,
          vat: 0,
          total: 90
        }
      ]
    }
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="min-h-screen bg-[#0f172a] text-slate-200 p-6 font-sans selection:bg-indigo-500/30">
          <div className="max-w-4xl mx-auto">
            {/* Header Section */}
            <header className="mb-12 flex justify-between items-end">
              <div>
                <span className="text-indigo-400 text-xs font-black uppercase tracking-[0.2em]">Revenue Operations</span>
                <h1 className="text-4xl font-bold text-white mt-2 tracking-tight">
                  Receivables <span className="text-slate-500 font-light">/ Overview</span>
                </h1>
              </div>
              <div className="text-right hidden md:block">
                <p className="text-slate-500 text-xs uppercase font-bold tracking-widest">Active Accounts</p>
                <p className="text-2xl font-mono text-white tracking-tighter">{data.length.toString().padStart(2, '0')}</p>
              </div>
            </header>

            {/* The List */}
            <div className="space-y-6">
              {data.map((item) => {
                const isExpanded = activeId === item.receivableId;

                return (
                  <div
                    key={item.receivableId}
                    className={`relative overflow-hidden transition-all duration-500 rounded-3xl border ${
                      isExpanded
                        ? 'bg-slate-800/40 border-indigo-500/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)]'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Main Row */}
                    <div
                      className="p-8 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6"
                      onClick={() => setActiveId(isExpanded ? null : item.receivableId)}
                    >
                      <div className="flex items-start gap-6">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-500 ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                        >
                          <User size={28} strokeWidth={1.5} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-white capitalize">{item.customer.name}</h2>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-tighter">
                              {item.customer.preferredPaymentMethod}
                            </span>
                          </div>
                          <p className="text-slate-500 text-sm mt-1 font-mono">
                            {item.transactionId.split('-')[0]} • {new Date(item.transactionDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">Outstanding</p>
                          <p
                            className={`text-3xl font-black tracking-tighter ${item.totals.balanceDue > 0 ? 'text-rose-500' : 'text-emerald-400'}`}
                          >
                            ${item.totals.balanceDue.toLocaleString()}
                          </p>
                        </div>
                        <ChevronRight
                          className={`text-slate-600 transition-transform duration-500 ${isExpanded ? 'rotate-90 text-indigo-400' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <div
                      className={`grid transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                    >
                      <div className="overflow-hidden">
                        <div className="p-8 pt-0 border-t border-slate-800/50">
                          <div className="grid md:grid-cols-2 gap-12 mt-8">
                            {/* Sale Items List */}
                            <div className="space-y-4">
                              <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <Package size={14} /> Line Items
                              </p>
                              {item.sales.map((sale: any, i: number) => (
                                <div
                                  key={i}
                                  className="group flex justify-between items-center p-4 rounded-2xl bg-slate-950/50 border border-slate-800/50 hover:border-indigo-500/30 transition-all"
                                >
                                  <div className="max-w-[70%]">
                                    <p className="text-sm font-medium text-slate-200 truncate">{sale.productName}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      {sale.quantity} units @ ${sale.price}
                                    </p>
                                  </div>
                                  <p className="font-mono text-sm text-indigo-300">${sale.total}</p>
                                </div>
                              ))}
                            </div>

                            {/* Financial Summary Card */}
                            <div className="relative group">
                              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                              <div className="relative bg-slate-950 rounded-2xl p-6 border border-slate-800">
                                <div className="space-y-4">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Gross Subtotal</span>
                                    <span className="text-slate-200 font-mono">${item.totals.totalAmount}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Credits Applied</span>
                                    <span className="text-emerald-500 font-mono">-$0.00</span>
                                  </div>
                                  <div className="h-px bg-slate-800 my-2"></div>
                                  <div className="flex justify-between items-end">
                                    <div>
                                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Total Due</p>
                                      <p className="text-2xl font-bold text-white">${item.totals.balanceDue}</p>
                                    </div>
                                    <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20">
                                      Process <ArrowUpRight size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumReceivableUI;
