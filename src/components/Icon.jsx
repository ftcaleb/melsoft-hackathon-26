const Icon = ({ name, size = 20, color = "currentColor", strokeWidth = 1.6, style, ...rest }) => {
  const props = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: color, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round",
    /* Icons here are always decorative — every control that uses one either
       has visible text beside it or its own aria-label. Hiding them from the
       accessibility tree keeps them out of accessible-name computation (a
       stray icon inside a labelled button makes its name disagree with its
       visible text, which breaks voice control) and stops IE-era SVG focus
       stops. Pass aria-hidden={false} on the rare icon that carries meaning
       on its own, and give it an aria-label at the same time. */
    "aria-hidden": true,
    focusable: "false",
    style, ...rest,
  };
  switch (name) {
    case "chevron-down": return <svg {...props}><polyline points="6 9 12 15 18 9"/></svg>;
    case "chevron-right": return <svg {...props}><polyline points="9 6 15 12 9 18"/></svg>;
    case "chevron-left": return <svg {...props}><polyline points="15 6 9 12 15 18"/></svg>;
    case "arrow-right": return <svg {...props}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>;
    case "arrow-up-right": return <svg {...props}><line x1="7" y1="17" x2="17" y2="7"/><polyline points="9 7 17 7 17 15"/></svg>;
    case "search": return <svg {...props}><circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.5" y2="16.5"/></svg>;
    case "user": return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
    case "menu": return <svg {...props}><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>;
    case "close": return <svg {...props}><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>;
    case "play": return <svg {...props} fill={color} stroke="none"><polygon points="6 4 20 12 6 20 6 4"/></svg>;
    case "check": return <svg {...props}><polyline points="5 13 10 18 19 7"/></svg>;
    case "shield": return <svg {...props}><path d="M12 3l8 3v5c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-3z"/><polyline points="9 12 11 14 15 10"/></svg>;
    case "users": return <svg {...props}><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15 15c2.5 0 6 1.5 6 5"/></svg>;
    case "briefcase": return <svg {...props}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="3" y1="13" x2="21" y2="13"/></svg>;
    case "globe": return <svg {...props}><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3c2.5 3 4 6 4 9s-1.5 6-4 9c-2.5-3-4-6-4-9s1.5-6 4-9z"/></svg>;
    case "card": return <svg {...props}><rect x="3" y="6" width="18" height="13" rx="2"/><line x1="3" y1="11" x2="21" y2="11"/><line x1="7" y1="16" x2="11" y2="16"/></svg>;
    case "trending": return <svg {...props}><polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/></svg>;
    case "calendar": return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>;
    case "clock": return <svg {...props}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>;
    case "tag": return <svg {...props}><path d="M3 11V4a1 1 0 0 1 1-1h7l10 10-8 8L3 11z"/><circle cx="8" cy="8" r="1.2" fill={color}/></svg>;
    case "star": return <svg {...props} fill={color} stroke="none"><polygon points="12 2 15 9 22 9 16.5 13.5 18.5 21 12 16.5 5.5 21 7.5 13.5 2 9 9 9"/></svg>;
    case "instagram": return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill={color}/></svg>;
    case "linkedin": return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="8" y1="11" x2="8" y2="17"/><circle cx="8" cy="8" r="0.8" fill={color}/><path d="M12 17v-3.5a2 2 0 0 1 4 0V17M12 11v6"/></svg>;
    case "youtube": return <svg {...props}><rect x="2" y="6" width="20" height="12" rx="3"/><polygon points="10 9 16 12 10 15" fill={color} stroke="none"/></svg>;
    case "facebook": return <svg {...props}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>;
    case "tiktok": return <svg {...props}><path d="M9 12a4 4 0 1 0 4 4v-12a5 5 0 0 0 5 5"/></svg>;
    case "whatsapp": return <svg {...props} fill={color} stroke="none" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.533 5.847L.057 23.428a.75.75 0 0 0 .916.916l5.649-1.458A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.846 0-3.574-.5-5.065-1.373l-.363-.214-3.757.969.999-3.671-.233-.38A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>;
    case "x":
    case "twitter": return <svg {...props} fill={color} stroke="none"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L2.055 2.25h6.938l4.262 5.636 5-5.636zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
    case "sparkle": return <svg {...props}><path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/></svg>;
    case "lightning": return <svg {...props}><polygon points="13 2 4 14 11 14 11 22 20 10 13 10 13 2"/></svg>;
    case "phone": return <svg {...props}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
    case "mail": return <svg {...props}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>;
    case "pin": return <svg {...props}><path d="M12 22s7-7.58 7-13a7 7 0 0 0-14 0c0 5.42 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>;
    case "badge-dollar-sign": return <svg {...props}><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>;
    case "trending-up": return <svg {...props}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
    case "award": return <svg {...props}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>;
    case "shield-check": return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>;
    case "laptop": return <svg {...props}><rect width="18" height="12" x="3" y="4" rx="2" ry="2"/><line x1="2" y1="20" x2="22" y2="20"/><line x1="5" y1="16" x2="19" y2="16"/></svg>;
    case "eye": return <svg {...props}><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "camera": return <svg {...props}><path d="M3 9a2 2 0 0 1 2-2h1.5l1.2-2h6.6l1.2 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.4"/></svg>;
    case "maximize": return <svg {...props}><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>;
    case "grid": return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
    case "film": return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="4" x2="7" y2="20"/><line x1="17" y1="4" x2="17" y2="20"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="8" x2="7" y2="8"/><line x1="17" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="7" y2="16"/><line x1="17" y1="16" x2="21" y2="16"/></svg>;
    default: return null;
  }
};

export default Icon;
