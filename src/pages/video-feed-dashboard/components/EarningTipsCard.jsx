// src/pages/video-feed-dashboard/components/EarningTipsCard.jsx
// ============================================================================
// NUEVO COMPONENTE: "Cómo ganar más puntos"
// Extraído de src/pages/points-rewards-store/index.jsx
// Este componente carga y muestra las reglas de puntos activas.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import Icon from '../../../components/AppIcon';

const EarningTipsCard = ({ className = '' }) => {
  const [pointsRules, setPointsRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(true);

  // ✅ Lógica extraída de 'points-rewards-store/index.jsx'
  useEffect(() => {
    const fetchPointsRules = async () => {
      setRulesLoading(true);
      try {
        // Carga solo las reglas marcadas para mostrar en la tienda/dashboard
        const { data, error } = await supabase
          .from('points_rules') 
          .select('id, action_name, points_amount, metadata') 
          .eq('show_in_store', true) // <-- Solo las que marcaste
          .gt('points_amount', 0) 
          .order('action_name', { ascending: true });

        if (error) throw error;
        
        // Mapea los datos a un formato simple
        const rules = data.map(rule => ({
          id: rule.id,
          icon: rule.metadata?.icon || 'Check', // <-- Lee el ícono desde metadata
          text: rule.action_name, // <-- Usa 'action_name'
          points: rule.points_amount // <-- Usa 'points_amount'
        }));
        setPointsRules(rules);

      } catch (err) {
        console.error("Error fetching points rules:", err);
      } finally {
        setRulesLoading(false);
      }
    };
    
    fetchPointsRules();
  }, []); // Se ejecuta solo una vez al cargar el componente

  // ✅ JSX extraído de 'points-rewards-store/index.jsx'
  return (
    <div className={`bg-card rounded-lg border p-6 ${className}`}>
      <h3 className="font-semibold text-foreground mb-4">Cómo ganar más puntos</h3>
      <div className="space-y-3">
        {rulesLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/4"></div>
            </div>
             <div className="flex justify-between items-center">
              <div className="h-4 bg-muted rounded w-2/4"></div>
              <div className="h-4 bg-muted rounded w-1/4"></div>
            </div>
          </div>
        ) : pointsRules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Completa acciones como ver videos y comentar para ganar puntos.
          </p>
        ) : (
          pointsRules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Icon name={rule.icon} size={16} className="text-muted-foreground" />
                <span className="text-sm text-foreground">{rule.text}</span>
              </div>
              <span className="text-sm font-medium text-success">
                +{rule.points}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EarningTipsCard;
