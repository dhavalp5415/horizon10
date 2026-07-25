"""Curated stock universe: India (NSE) + Global + Commodities.

Each entry: (yahoo_ticker, display_name, sector). Sectors are our own
grouping labels so industry rankings stay meaningful and comparable.
"""

INDIA = [
    # --- IT Services & Software ---
    ("TCS.NS", "Tata Consultancy Services", "IT Services"),
    ("INFY.NS", "Infosys", "IT Services"),
    ("HCLTECH.NS", "HCL Technologies", "IT Services"),
    ("WIPRO.NS", "Wipro", "IT Services"),
    ("TECHM.NS", "Tech Mahindra", "IT Services"),
    ("PERSISTENT.NS", "Persistent Systems", "IT Services"),
    ("COFORGE.NS", "Coforge", "IT Services"),
    ("MPHASIS.NS", "Mphasis", "IT Services"),
    ("KPITTECH.NS", "KPIT Technologies", "IT Services"),
    ("LTTS.NS", "L&T Technology Services", "IT Services"),
    ("TATAELXSI.NS", "Tata Elxsi", "IT Services"),
    ("TATATECH.NS", "Tata Technologies", "IT Services"),
    ("OFSS.NS", "Oracle Financial Services", "IT Services"),
    # --- Banks ---
    ("HDFCBANK.NS", "HDFC Bank", "Banks"),
    ("ICICIBANK.NS", "ICICI Bank", "Banks"),
    ("KOTAKBANK.NS", "Kotak Mahindra Bank", "Banks"),
    ("AXISBANK.NS", "Axis Bank", "Banks"),
    ("SBIN.NS", "State Bank of India", "Banks"),
    ("INDUSINDBK.NS", "IndusInd Bank", "Banks"),
    ("BANKBARODA.NS", "Bank of Baroda", "Banks"),
    ("PNB.NS", "Punjab National Bank", "Banks"),
    ("CANBK.NS", "Canara Bank", "Banks"),
    ("IDFCFIRSTB.NS", "IDFC First Bank", "Banks"),
    ("FEDERALBNK.NS", "Federal Bank", "Banks"),
    ("AUBANK.NS", "AU Small Finance Bank", "Banks"),
    # --- NBFC & Financial Services ---
    ("BAJFINANCE.NS", "Bajaj Finance", "NBFC & Fin Services"),
    ("BAJAJFINSV.NS", "Bajaj Finserv", "NBFC & Fin Services"),
    ("SHRIRAMFIN.NS", "Shriram Finance", "NBFC & Fin Services"),
    ("CHOLAFIN.NS", "Cholamandalam Finance", "NBFC & Fin Services"),
    ("MUTHOOTFIN.NS", "Muthoot Finance", "NBFC & Fin Services"),
    ("RECLTD.NS", "REC Ltd", "NBFC & Fin Services"),
    ("PFC.NS", "Power Finance Corp", "NBFC & Fin Services"),
    ("IRFC.NS", "Indian Railway Finance", "NBFC & Fin Services"),
    ("HDFCAMC.NS", "HDFC AMC", "Capital Markets"),
    ("CAMS.NS", "CAMS", "Capital Markets"),
    ("CDSL.NS", "CDSL", "Capital Markets"),
    ("BSE.NS", "BSE Ltd", "Capital Markets"),
    ("MCX.NS", "MCX India", "Capital Markets"),
    ("ANGELONE.NS", "Angel One", "Capital Markets"),
    ("IEX.NS", "Indian Energy Exchange", "Capital Markets"),
    # --- Insurance ---
    ("HDFCLIFE.NS", "HDFC Life", "Insurance"),
    ("SBILIFE.NS", "SBI Life", "Insurance"),
    ("ICICIPRULI.NS", "ICICI Prudential Life", "Insurance"),
    ("ICICIGI.NS", "ICICI Lombard", "Insurance"),
    # --- Oil, Gas & Energy ---
    ("RELIANCE.NS", "Reliance Industries", "Oil Gas & Energy"),
    ("ONGC.NS", "ONGC", "Oil Gas & Energy"),
    ("BPCL.NS", "BPCL", "Oil Gas & Energy"),
    ("IOC.NS", "Indian Oil", "Oil Gas & Energy"),
    ("GAIL.NS", "GAIL India", "Oil Gas & Energy"),
    ("COALINDIA.NS", "Coal India", "Oil Gas & Energy"),
    # --- Power & Utilities ---
    ("NTPC.NS", "NTPC", "Power & Utilities"),
    ("POWERGRID.NS", "Power Grid Corp", "Power & Utilities"),
    ("TATAPOWER.NS", "Tata Power", "Power & Utilities"),
    ("ADANIGREEN.NS", "Adani Green Energy", "Power & Utilities"),
    ("ADANIPOWER.NS", "Adani Power", "Power & Utilities"),
    ("JSWENERGY.NS", "JSW Energy", "Power & Utilities"),
    ("NHPC.NS", "NHPC", "Power & Utilities"),
    # --- Autos & Auto Components ---
    ("MARUTI.NS", "Maruti Suzuki", "Autos"),
    ("M&M.NS", "Mahindra & Mahindra", "Autos"),
    ("TMPV.NS", "Tata Motors Passenger Vehicles", "Autos"),
    ("TMCV.NS", "Tata Motors Commercial Vehicles", "Autos"),
    ("EICHERMOT.NS", "Eicher Motors", "Autos"),
    ("BAJAJ-AUTO.NS", "Bajaj Auto", "Autos"),
    ("HEROMOTOCO.NS", "Hero MotoCorp", "Autos"),
    ("TVSMOTOR.NS", "TVS Motor", "Autos"),
    ("MOTHERSON.NS", "Samvardhana Motherson", "Auto Components"),
    ("BOSCHLTD.NS", "Bosch India", "Auto Components"),
    ("SONACOMS.NS", "Sona BLW Precision", "Auto Components"),
    ("UNOMINDA.NS", "Uno Minda", "Auto Components"),
    ("TIINDIA.NS", "Tube Investments", "Auto Components"),
    ("EXIDEIND.NS", "Exide Industries", "Auto Components"),
    # --- Pharma & Healthcare ---
    ("SUNPHARMA.NS", "Sun Pharma", "Pharma"),
    ("DRREDDY.NS", "Dr Reddy's Labs", "Pharma"),
    ("CIPLA.NS", "Cipla", "Pharma"),
    ("DIVISLAB.NS", "Divi's Laboratories", "Pharma"),
    ("TORNTPHARM.NS", "Torrent Pharma", "Pharma"),
    ("LUPIN.NS", "Lupin", "Pharma"),
    ("AUROPHARMA.NS", "Aurobindo Pharma", "Pharma"),
    ("ZYDUSLIFE.NS", "Zydus Lifesciences", "Pharma"),
    ("ALKEM.NS", "Alkem Laboratories", "Pharma"),
    ("MANKIND.NS", "Mankind Pharma", "Pharma"),
    ("SYNGENE.NS", "Syngene International", "Healthcare Services"),
    ("APOLLOHOSP.NS", "Apollo Hospitals", "Healthcare Services"),
    ("MAXHEALTH.NS", "Max Healthcare", "Healthcare Services"),
    ("FORTIS.NS", "Fortis Healthcare", "Healthcare Services"),
    # --- FMCG & Consumer ---
    ("HINDUNILVR.NS", "Hindustan Unilever", "FMCG"),
    ("ITC.NS", "ITC", "FMCG"),
    ("NESTLEIND.NS", "Nestle India", "FMCG"),
    ("BRITANNIA.NS", "Britannia", "FMCG"),
    ("TATACONSUM.NS", "Tata Consumer Products", "FMCG"),
    ("DABUR.NS", "Dabur", "FMCG"),
    ("MARICO.NS", "Marico", "FMCG"),
    ("GODREJCP.NS", "Godrej Consumer", "FMCG"),
    ("COLPAL.NS", "Colgate-Palmolive India", "FMCG"),
    ("VBL.NS", "Varun Beverages", "FMCG"),
    ("UNITDSPR.NS", "United Spirits", "FMCG"),
    # --- Retail & Consumer Discretionary ---
    ("DMART.NS", "Avenue Supermarts (DMart)", "Retail & Discretionary"),
    ("TRENT.NS", "Trent (Westside/Zudio)", "Retail & Discretionary"),
    ("TITAN.NS", "Titan Company", "Retail & Discretionary"),
    ("PAGEIND.NS", "Page Industries", "Retail & Discretionary"),
    ("JUBLFOOD.NS", "Jubilant FoodWorks", "Retail & Discretionary"),
    ("ASIANPAINT.NS", "Asian Paints", "Paints & Building Mat."),
    ("BERGEPAINT.NS", "Berger Paints", "Paints & Building Mat."),
    ("PIDILITIND.NS", "Pidilite Industries", "Paints & Building Mat."),
    ("ASTRAL.NS", "Astral", "Paints & Building Mat."),
    ("SUPREMEIND.NS", "Supreme Industries", "Paints & Building Mat."),
    # --- Internet & New-age ---
    ("ETERNAL.NS", "Eternal (Zomato)", "Internet Platforms"),
    ("PAYTM.NS", "Paytm (One97)", "Internet Platforms"),
    ("NAUKRI.NS", "Info Edge (Naukri)", "Internet Platforms"),
    ("POLICYBZR.NS", "PB Fintech (Policybazaar)", "Internet Platforms"),
    ("NYKAA.NS", "Nykaa (FSN E-Commerce)", "Internet Platforms"),
    ("IRCTC.NS", "IRCTC", "Internet Platforms"),
    # --- Capital Goods & Industrials ---
    ("LT.NS", "Larsen & Toubro", "Capital Goods & Infra"),
    ("SIEMENS.NS", "Siemens India", "Capital Goods & Infra"),
    ("ABB.NS", "ABB India", "Capital Goods & Infra"),
    ("CGPOWER.NS", "CG Power", "Capital Goods & Infra"),
    ("CUMMINSIND.NS", "Cummins India", "Capital Goods & Infra"),
    ("THERMAX.NS", "Thermax", "Capital Goods & Infra"),
    ("POLYCAB.NS", "Polycab India", "Electricals & Wires"),
    ("KEI.NS", "KEI Industries", "Electricals & Wires"),
    ("HAVELLS.NS", "Havells India", "Electricals & Wires"),
    ("VOLTAS.NS", "Voltas", "Electricals & Wires"),
    ("BLUESTARCO.NS", "Blue Star", "Electricals & Wires"),
    ("DIXON.NS", "Dixon Technologies", "Electronics Mfg (EMS)"),
    ("KAYNES.NS", "Kaynes Technology", "Electronics Mfg (EMS)"),
    ("AMBER.NS", "Amber Enterprises", "Electronics Mfg (EMS)"),
    # --- Defence & Aerospace ---
    ("HAL.NS", "Hindustan Aeronautics", "Defence & Aerospace"),
    ("BEL.NS", "Bharat Electronics", "Defence & Aerospace"),
    ("BDL.NS", "Bharat Dynamics", "Defence & Aerospace"),
    ("MAZDOCK.NS", "Mazagon Dock", "Defence & Aerospace"),
    ("COCHINSHIP.NS", "Cochin Shipyard", "Defence & Aerospace"),
    ("SOLARINDS.NS", "Solar Industries", "Defence & Aerospace"),
    ("DATAPATTNS.NS", "Data Patterns", "Defence & Aerospace"),
    # --- Metals & Mining ---
    ("TATASTEEL.NS", "Tata Steel", "Metals & Mining"),
    ("JSWSTEEL.NS", "JSW Steel", "Metals & Mining"),
    ("HINDALCO.NS", "Hindalco", "Metals & Mining"),
    ("VEDL.NS", "Vedanta", "Metals & Mining"),
    ("JINDALSTEL.NS", "Jindal Steel & Power", "Metals & Mining"),
    ("APLAPOLLO.NS", "APL Apollo Tubes", "Metals & Mining"),
    # --- Cement ---
    ("ULTRACEMCO.NS", "UltraTech Cement", "Cement"),
    ("SHREECEM.NS", "Shree Cement", "Cement"),
    ("AMBUJACEM.NS", "Ambuja Cements", "Cement"),
    ("GRASIM.NS", "Grasim Industries", "Cement"),
    # --- Chemicals ---
    ("PIIND.NS", "PI Industries", "Chemicals"),
    ("SRF.NS", "SRF", "Chemicals"),
    ("DEEPAKNTR.NS", "Deepak Nitrite", "Chemicals"),
    # --- Real Estate & Conglomerates ---
    ("DLF.NS", "DLF", "Real Estate"),
    ("LODHA.NS", "Macrotech (Lodha)", "Real Estate"),
    ("ADANIENT.NS", "Adani Enterprises", "Conglomerates & Ports"),
    ("ADANIPORTS.NS", "Adani Ports", "Conglomerates & Ports"),
    # --- Telecom & Logistics ---
    ("BHARTIARTL.NS", "Bharti Airtel", "Telecom"),
    ("INDUSTOWER.NS", "Indus Towers", "Telecom"),
    ("TATACOMM.NS", "Tata Communications", "Telecom"),
    ("INDIGO.NS", "InterGlobe Aviation (IndiGo)", "Transport & Logistics"),
    # ================= SMALL & MID CAPS (multibagger hunting ground) =========
    # --- IT & Digital midcaps ---
    ("SONATSOFTW.NS", "Sonata Software", "IT Services"),
    ("NEWGEN.NS", "Newgen Software", "IT Services"),
    ("INTELLECT.NS", "Intellect Design Arena", "IT Services"),
    ("HAPPSTMNDS.NS", "Happiest Minds", "IT Services"),
    ("BSOFT.NS", "Birlasoft", "IT Services"),
    ("ZENSARTECH.NS", "Zensar Technologies", "IT Services"),
    ("MASTEK.NS", "Mastek", "IT Services"),
    ("CYIENT.NS", "Cyient", "IT Services"),
    ("TANLA.NS", "Tanla Platforms", "Internet Platforms"),
    ("ROUTE.NS", "Route Mobile", "Internet Platforms"),
    ("MAPMYINDIA.NS", "MapmyIndia (CE Info)", "Internet Platforms"),
    ("RATEGAIN.NS", "RateGain Travel", "Internet Platforms"),
    ("NAZARA.NS", "Nazara Technologies", "Internet Platforms"),
    ("LATENTVIEW.NS", "Latent View Analytics", "IT Services"),
    ("SWIGGY.NS", "Swiggy", "Internet Platforms"),
    # --- EMS & Electronics ---
    ("SYRMA.NS", "Syrma SGS Technology", "Electronics Mfg (EMS)"),
    ("PGEL.NS", "PG Electroplast", "Electronics Mfg (EMS)"),
    ("VGUARD.NS", "V-Guard Industries", "Electricals & Wires"),
    ("CROMPTON.NS", "Crompton Greaves Consumer", "Electricals & Wires"),
    # --- Defence, Rail & Govt Infra ---
    ("GRSE.NS", "Garden Reach Shipbuilders", "Defence & Aerospace"),
    ("ZENTEC.NS", "Zen Technologies", "Defence & Aerospace"),
    ("PARAS.NS", "Paras Defence", "Defence & Aerospace"),
    ("MTARTECH.NS", "MTAR Technologies", "Defence & Aerospace"),
    ("TITAGARH.NS", "Titagarh Rail Systems", "Railways & Infra"),
    ("JWL.NS", "Jupiter Wagons", "Railways & Infra"),
    ("IRCON.NS", "IRCON International", "Railways & Infra"),
    ("RAILTEL.NS", "RailTel Corp", "Railways & Infra"),
    ("RVNL.NS", "Rail Vikas Nigam", "Railways & Infra"),
    ("NBCC.NS", "NBCC India", "Railways & Infra"),
    ("HUDCO.NS", "HUDCO", "NBFC & Fin Services"),
    # --- Renewables & Power equipment ---
    ("SUZLON.NS", "Suzlon Energy", "Renewables & Solar"),
    ("INOXWIND.NS", "Inox Wind", "Renewables & Solar"),
    ("WAAREEENER.NS", "Waaree Energies", "Renewables & Solar"),
    ("PREMIERENE.NS", "Premier Energies", "Renewables & Solar"),
    ("KPIGREEN.NS", "KPI Green Energy", "Renewables & Solar"),
    ("TORNTPOWER.NS", "Torrent Power", "Power & Utilities"),
    ("CESC.NS", "CESC", "Power & Utilities"),
    # --- Specialty Chemicals ---
    ("AARTIIND.NS", "Aarti Industries", "Chemicals"),
    ("NAVINFLUOR.NS", "Navin Fluorine", "Chemicals"),
    ("FLUOROCHEM.NS", "Gujarat Fluorochemicals", "Chemicals"),
    ("CLEAN.NS", "Clean Science & Tech", "Chemicals"),
    ("FINEORG.NS", "Fine Organic Industries", "Chemicals"),
    ("ALKYLAMINE.NS", "Alkyl Amines", "Chemicals"),
    ("VINATIORGA.NS", "Vinati Organics", "Chemicals"),
    ("TATACHEM.NS", "Tata Chemicals", "Chemicals"),
    # --- Pharma & Healthcare midcaps ---
    ("LAURUSLABS.NS", "Laurus Labs", "Pharma"),
    ("AJANTPHARM.NS", "Ajanta Pharma", "Pharma"),
    ("IPCALAB.NS", "IPCA Laboratories", "Pharma"),
    ("NATCOPHARM.NS", "Natco Pharma", "Pharma"),
    ("ERIS.NS", "Eris Lifesciences", "Pharma"),
    ("JBCHEPHARM.NS", "JB Chemicals & Pharma", "Pharma"),
    ("CAPLIPOINT.NS", "Caplin Point Labs", "Pharma"),
    ("NEULANDLAB.NS", "Neuland Laboratories", "Pharma"),
    ("GLAND.NS", "Gland Pharma", "Pharma"),
    ("COHANCE.NS", "Cohance Lifesciences (ex-Suven)", "Pharma"),
    ("POLYMED.NS", "Poly Medicure", "Healthcare Services"),
    ("VIJAYA.NS", "Vijaya Diagnostic Centre", "Healthcare Services"),
    ("RAINBOW.NS", "Rainbow Children's Medicare", "Healthcare Services"),
    ("MEDANTA.NS", "Global Health (Medanta)", "Healthcare Services"),
    ("KIMS.NS", "KIMS Hospitals", "Healthcare Services"),
    ("ASTERDM.NS", "Aster DM Healthcare", "Healthcare Services"),
    ("LALPATHLAB.NS", "Dr Lal PathLabs", "Healthcare Services"),
    # --- Consumer, Retail & Travel ---
    ("RADICO.NS", "Radico Khaitan", "FMCG"),
    ("BIKAJI.NS", "Bikaji Foods", "FMCG"),
    ("LTFOODS.NS", "LT Foods (Daawat)", "FMCG"),
    ("HONASA.NS", "Honasa Consumer (Mamaearth)", "FMCG"),
    ("METROBRAND.NS", "Metro Brands", "Retail & Discretionary"),
    ("VMART.NS", "V-Mart Retail", "Retail & Discretionary"),
    ("SENCO.NS", "Senco Gold", "Retail & Discretionary"),
    ("KALYANKJIL.NS", "Kalyan Jewellers", "Retail & Discretionary"),
    ("CELLO.NS", "Cello World", "Retail & Discretionary"),
    ("DOMS.NS", "DOMS Industries", "Retail & Discretionary"),
    ("SAFARI.NS", "Safari Industries", "Retail & Discretionary"),
    ("INDHOTEL.NS", "Indian Hotels (Taj)", "Travel & Hotels"),
    ("LEMONTREE.NS", "Lemon Tree Hotels", "Travel & Hotels"),
    ("CHALET.NS", "Chalet Hotels", "Travel & Hotels"),
    ("IXIGO.NS", "Ixigo (Le Travenues)", "Travel & Hotels"),
    ("TBOTEK.NS", "TBO Tek", "Travel & Hotels"),
    # --- Financial midcaps ---
    ("POONAWALLA.NS", "Poonawalla Fincorp", "NBFC & Fin Services"),
    ("MANAPPURAM.NS", "Manappuram Finance", "NBFC & Fin Services"),
    ("CREDITACC.NS", "CreditAccess Grameen", "NBFC & Fin Services"),
    ("FIVESTAR.NS", "Five-Star Business Finance", "NBFC & Fin Services"),
    ("HOMEFIRST.NS", "Home First Finance", "NBFC & Fin Services"),
    ("AAVAS.NS", "Aavas Financiers", "NBFC & Fin Services"),
    ("APTUS.NS", "Aptus Value Housing", "NBFC & Fin Services"),
    ("JIOFIN.NS", "Jio Financial Services", "NBFC & Fin Services"),
    ("ABCAPITAL.NS", "Aditya Birla Capital", "NBFC & Fin Services"),
    ("NUVAMA.NS", "Nuvama Wealth", "Capital Markets"),
    ("MOTILALOFS.NS", "Motilal Oswal Financial", "Capital Markets"),
    ("360ONE.NS", "360 ONE WAM", "Capital Markets"),
    ("KFINTECH.NS", "KFin Technologies", "Capital Markets"),
    ("LICI.NS", "Life Insurance Corp (LIC)", "Insurance"),
    # --- Capital Goods & Precision Mfg ---
    ("TRITURBINE.NS", "Triveni Turbine", "Capital Goods & Infra"),
    ("ELECON.NS", "Elecon Engineering", "Capital Goods & Infra"),
    ("AIAENG.NS", "AIA Engineering", "Capital Goods & Infra"),
    ("RATNAMANI.NS", "Ratnamani Metals & Tubes", "Capital Goods & Infra"),
    ("CARBORUNIV.NS", "Carborundum Universal", "Capital Goods & Infra"),
    ("GRINDWELL.NS", "Grindwell Norton", "Capital Goods & Infra"),
    ("TIMKEN.NS", "Timken India", "Capital Goods & Infra"),
    ("SCHAEFFLER.NS", "Schaeffler India", "Capital Goods & Infra"),
    ("SKFINDIA.NS", "SKF India", "Capital Goods & Infra"),
    ("HONAUT.NS", "Honeywell Automation India", "Capital Goods & Infra"),
    ("KSB.NS", "KSB Ltd", "Capital Goods & Infra"),
    ("INOXINDIA.NS", "INOX India (cryogenics)", "Capital Goods & Infra"),
    ("JYOTICNC.NS", "Jyoti CNC Automation", "Capital Goods & Infra"),
    # --- Auto Components & EV ---
    ("ENDURANCE.NS", "Endurance Technologies", "Auto Components"),
    ("CRAFTSMAN.NS", "Craftsman Automation", "Auto Components"),
    ("HAPPYFORGE.NS", "Happy Forgings", "Auto Components"),
    ("JBMA.NS", "JBM Auto", "Auto Components"),
    ("OLECTRA.NS", "Olectra Greentech", "Auto Components"),
    # --- Realty & Infra ---
    ("PRESTIGE.NS", "Prestige Estates", "Real Estate"),
    ("BRIGADE.NS", "Brigade Enterprises", "Real Estate"),
    ("SOBHA.NS", "Sobha", "Real Estate"),
    ("ANANTRAJ.NS", "Anant Raj (data centres)", "Real Estate"),
    ("NCC.NS", "NCC Ltd", "Capital Goods & Infra"),
    ("PNCINFRA.NS", "PNC Infratech", "Capital Goods & Infra"),
    ("HGINFRA.NS", "HG Infra Engineering", "Capital Goods & Infra"),
    ("GRINFRA.NS", "G R Infraprojects", "Capital Goods & Infra"),
    # --- Wires, Materials & Others ---
    ("RRKABEL.NS", "R R Kabel", "Electricals & Wires"),
    ("FINCABLES.NS", "Finolex Cables", "Electricals & Wires"),
    ("GRAVITA.NS", "Gravita India (recycling)", "Metals & Mining"),
    ("KPRMILL.NS", "KPR Mill", "Retail & Discretionary"),
]

GLOBAL = [
    # --- Big Tech ---
    ("AAPL", "Apple", "Big Tech"),
    ("MSFT", "Microsoft", "Big Tech"),
    ("GOOGL", "Alphabet (Google)", "Big Tech"),
    ("AMZN", "Amazon", "Big Tech"),
    ("META", "Meta Platforms", "Big Tech"),
    ("NFLX", "Netflix", "Big Tech"),
    ("ORCL", "Oracle", "Big Tech"),
    # --- Semiconductors & AI Hardware ---
    ("NVDA", "NVIDIA", "Semiconductors & AI"),
    ("AMD", "AMD", "Semiconductors & AI"),
    ("AVGO", "Broadcom", "Semiconductors & AI"),
    ("TSM", "TSMC (ADR)", "Semiconductors & AI"),
    ("ASML", "ASML (ADR)", "Semiconductors & AI"),
    ("QCOM", "Qualcomm", "Semiconductors & AI"),
    ("TXN", "Texas Instruments", "Semiconductors & AI"),
    ("MU", "Micron Technology", "Semiconductors & AI"),
    ("AMAT", "Applied Materials", "Semiconductors & AI"),
    ("LRCX", "Lam Research", "Semiconductors & AI"),
    ("KLAC", "KLA Corp", "Semiconductors & AI"),
    ("ARM", "Arm Holdings", "Semiconductors & AI"),
    ("INTC", "Intel", "Semiconductors & AI"),
    # --- Software & Cloud ---
    ("CRM", "Salesforce", "Software & Cloud"),
    ("ADBE", "Adobe", "Software & Cloud"),
    ("NOW", "ServiceNow", "Software & Cloud"),
    ("INTU", "Intuit", "Software & Cloud"),
    ("SAP", "SAP (ADR)", "Software & Cloud"),
    ("SNOW", "Snowflake", "Software & Cloud"),
    ("PLTR", "Palantir", "Software & Cloud"),
    ("SHOP", "Shopify", "Software & Cloud"),
    # --- Cybersecurity ---
    ("CRWD", "CrowdStrike", "Cybersecurity"),
    ("PANW", "Palo Alto Networks", "Cybersecurity"),
    ("FTNT", "Fortinet", "Cybersecurity"),
    ("ZS", "Zscaler", "Cybersecurity"),
    # --- Internet & Consumer Tech ---
    ("TSLA", "Tesla", "EV & Mobility"),
    ("UBER", "Uber", "Internet Platforms"),
    ("ABNB", "Airbnb", "Internet Platforms"),
    ("BKNG", "Booking Holdings", "Internet Platforms"),
    ("MELI", "MercadoLibre", "Internet Platforms"),
    ("SE", "Sea Limited", "Internet Platforms"),
    ("BABA", "Alibaba (ADR)", "Internet Platforms"),
    ("PDD", "PDD Holdings (Temu)", "Internet Platforms"),
    ("SPOT", "Spotify", "Internet Platforms"),
    # --- Payments & Fintech ---
    ("V", "Visa", "Payments & Fintech"),
    ("MA", "Mastercard", "Payments & Fintech"),
    ("PYPL", "PayPal", "Payments & Fintech"),
    ("AXP", "American Express", "Payments & Fintech"),
    # --- Banks & Asset Managers ---
    ("JPM", "JPMorgan Chase", "Banks & Asset Mgmt"),
    ("BAC", "Bank of America", "Banks & Asset Mgmt"),
    ("GS", "Goldman Sachs", "Banks & Asset Mgmt"),
    ("MS", "Morgan Stanley", "Banks & Asset Mgmt"),
    ("BLK", "BlackRock", "Banks & Asset Mgmt"),
    ("BRK-B", "Berkshire Hathaway", "Banks & Asset Mgmt"),
    # --- Healthcare & Pharma ---
    ("LLY", "Eli Lilly", "Healthcare & Pharma"),
    ("NVO", "Novo Nordisk (ADR)", "Healthcare & Pharma"),
    ("UNH", "UnitedHealth", "Healthcare & Pharma"),
    ("JNJ", "Johnson & Johnson", "Healthcare & Pharma"),
    ("ABBV", "AbbVie", "Healthcare & Pharma"),
    ("MRK", "Merck", "Healthcare & Pharma"),
    ("TMO", "Thermo Fisher", "Healthcare & Pharma"),
    ("ISRG", "Intuitive Surgical", "Healthcare & Pharma"),
    ("VRTX", "Vertex Pharma", "Healthcare & Pharma"),
    ("REGN", "Regeneron", "Healthcare & Pharma"),
    # --- Consumer Staples & Brands ---
    ("WMT", "Walmart", "Consumer & Brands"),
    ("COST", "Costco", "Consumer & Brands"),
    ("PG", "Procter & Gamble", "Consumer & Brands"),
    ("KO", "Coca-Cola", "Consumer & Brands"),
    ("PEP", "PepsiCo", "Consumer & Brands"),
    ("MCD", "McDonald's", "Consumer & Brands"),
    ("NKE", "Nike", "Consumer & Brands"),
    ("SBUX", "Starbucks", "Consumer & Brands"),
    ("HD", "Home Depot", "Consumer & Brands"),
    ("DIS", "Walt Disney", "Consumer & Brands"),
    ("MC.PA", "LVMH (Paris)", "Consumer & Brands"),
    # --- Industrials, Defence & Energy ---
    ("CAT", "Caterpillar", "Industrials & Defence"),
    ("DE", "Deere & Co", "Industrials & Defence"),
    ("GE", "GE Aerospace", "Industrials & Defence"),
    ("HON", "Honeywell", "Industrials & Defence"),
    ("LMT", "Lockheed Martin", "Industrials & Defence"),
    ("RTX", "RTX Corp", "Industrials & Defence"),
    ("UNP", "Union Pacific", "Industrials & Defence"),
    ("XOM", "ExxonMobil", "Energy"),
    ("CVX", "Chevron", "Energy"),
    ("LIN", "Linde", "Energy"),
    ("NEE", "NextEra Energy", "Energy"),
    # --- Japan / Asia leaders (ADRs) ---
    ("TM", "Toyota (ADR)", "Consumer & Brands"),
    ("SONY", "Sony (ADR)", "Big Tech"),
    # ================= HIGH-GROWTH MID CAPS (multibagger hunting ground) =====
    ("NET", "Cloudflare", "Software & Cloud"),
    ("DDOG", "Datadog", "Software & Cloud"),
    ("APP", "AppLovin", "Software & Cloud"),
    ("DUOL", "Duolingo", "Software & Cloud"),
    ("TTD", "The Trade Desk", "Internet Platforms"),
    ("HOOD", "Robinhood", "Payments & Fintech"),
    ("NU", "Nu Holdings (Nubank)", "Payments & Fintech"),
    ("HIMS", "Hims & Hers Health", "Healthcare & Pharma"),
    ("AXON", "Axon Enterprise", "Industrials & Defence"),
    ("VRT", "Vertiv (AI data centres)", "Industrials & Defence"),
    ("RKLB", "Rocket Lab", "Industrials & Defence"),
    ("ANET", "Arista Networks", "Semiconductors & AI"),
    ("MRVL", "Marvell Technology", "Semiconductors & AI"),
    ("CRDO", "Credo Technology", "Semiconductors & AI"),
    ("ALAB", "Astera Labs", "Semiconductors & AI"),
    ("CEG", "Constellation Energy", "Energy"),
    ("VST", "Vistra Corp", "Energy"),
    ("CELH", "Celsius Holdings", "Consumer & Brands"),
    ("ONON", "On Holding", "Consumer & Brands"),
    ("ELF", "e.l.f. Beauty", "Consumer & Brands"),
]

COMMODITIES = [
    ("GC=F", "Gold (COMEX, USD/oz)", "Precious Metals"),
    ("SI=F", "Silver (COMEX, USD/oz)", "Precious Metals"),
    ("GOLDBEES.NS", "Nippon Gold BeES ETF (INR)", "Precious Metals"),
    ("SILVERBEES.NS", "Nippon Silver BeES ETF (INR)", "Precious Metals"),
    ("HG=F", "Copper (COMEX, USD/lb)", "Industrial Metals"),
    ("CL=F", "Crude Oil WTI (USD/bbl)", "Energy Commodities"),
]


# ---------------------------------------------------------------------------
# Full-market layer: every NSE main-board equity + the S&P Composite 1500,
# resolved and sector-mapped by build_universe.py. The curated lists above are
# the override layer — they keep their hand-checked names and sector labels,
# and a ticker present in both is never duplicated.
# ---------------------------------------------------------------------------
import json as _json
from pathlib import Path as _Path

_AUTO_FILE = _Path(__file__).parent / "universe_auto.json"


def _load_auto():
    if not _AUTO_FILE.exists():
        return {"india": [], "global": []}
    try:
        d = _json.loads(_AUTO_FILE.read_text(encoding="utf-8"))
        return {"india": d.get("india", []), "global": d.get("global", [])}
    except (ValueError, OSError):
        return {"india": [], "global": []}


def _merged():
    """[(ticker, name, sector, market)] — curated first, then auto, deduped."""
    rows, seen = [], set()
    for lst, mkt in ((INDIA, "india"), (GLOBAL, "global")):
        for t, n, s in lst:
            if t not in seen:
                seen.add(t)
                rows.append((t, n, s, mkt))
    auto = _load_auto()
    for mkt in ("india", "global"):
        for entry in auto[mkt]:
            t, n, s = entry[0], entry[1], entry[2]
            if t not in seen:
                seen.add(t)
                rows.append((t, n, s, mkt))
    return rows


def all_stocks():
    """[(ticker, name, sector, market), ...] for every stock (no commodities)."""
    return _merged()


def stock_meta():
    """ticker -> {name, sector, market}"""
    return {t: {"name": n, "sector": s, "market": m} for t, n, s, m in all_stocks()}


def universe_stats():
    rows = all_stocks()
    curated = len(INDIA) + len(GLOBAL)
    return {
        "total": len(rows),
        "india": sum(1 for r in rows if r[3] == "india"),
        "global": sum(1 for r in rows if r[3] == "global"),
        "curated": curated,
        "auto_added": len(rows) - curated,
    }
