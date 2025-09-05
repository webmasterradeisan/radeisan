// SupabaseDebugChecker.jsx - Herramienta de diagnóstico temporal
// Agrega este componente temporalmente para debuggear

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const SupabaseDebugChecker = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testPassword, setTestPassword] = useState('');

  const addResult = (test, status, message, data = null) => {
    setResults(prev => [...prev, {
      test,
      status, // 'success', 'error', 'warning'
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const clearResults = () => setResults([]);

  // Test 1: Verificar configuración básica
  const testBasicConfig = async () => {
    addResult('Configuración', 'info', 'Verificando configuración de Supabase...');
    
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!url || !key) {
        addResult('Configuración', 'error', 'Variables de entorno faltantes', {
          url: !!url,
          key: !!key
        });
        return false;
      }
      
      addResult('Configuración', 'success', 'Variables de entorno encontradas', {
        url: url.substring(0, 30) + '...',
        keyLength: key.length
      });
      return true;
    } catch (error) {
      addResult('Configuración', 'error', 'Error verificando configuración', error);
      return false;
    }
  };

  // Test 2: Verificar conectividad
  const testConnectivity = async () => {
    addResult('Conectividad', 'info', 'Probando conexión a Supabase...');
    
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        addResult('Conectividad', 'error', 'Error de conexión', error);
        return false;
      }
      
      addResult('Conectividad', 'success', 'Conexión exitosa', { videosCount: data });
      return true;
    } catch (error) {
      addResult('Conectividad', 'error', 'Error crítico de conexión', error);
      return false;
    }
  };

  // Test 3: Verificar autenticación
  const testAuth = async () => {
    if (!testEmail || !testPassword) {
      addResult('Autenticación', 'warning', 'Email y contraseña requeridos para test');
      return;
    }

    addResult('Autenticación', 'info', `Probando login con ${testEmail}...`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      
      if (error) {
        addResult('Autenticación', 'error', 'Error de autenticación', {
          code: error.code,
          message: error.message
        });
        return false;
      }
      
      if (data?.session) {
        addResult('Autenticación', 'success', 'Login exitoso', {
          userId: data.session.user.id,
          email: data.session.user.email
        });
        
        // Cerrar sesión inmediatamente
        await supabase.auth.signOut();
        addResult('Autenticación', 'info', 'Sesión cerrada automáticamente');
        return true;
      } else {
        addResult('Autenticación', 'error', 'No se recibió sesión válida');
        return false;
      }
    } catch (error) {
      addResult('Autenticación', 'error', 'Error crítico en autenticación', error);
      return false;
    }
  };

  // Test 4: Verificar user_profiles
  const testUserProfiles = async () => {
    addResult('User Profiles', 'info', 'Verificando tabla user_profiles...');
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') {
        addResult('User Profiles', 'error', 'Tabla user_profiles no existe');
        return false;
      } else if (error) {
        addResult('User Profiles', 'warning', 'Problema de acceso a user_profiles', error);
        return false;
      }
      
      addResult('User Profiles', 'success', 'Tabla user_profiles accesible');
      return true;
    } catch (error) {
      addResult('User Profiles', 'error', 'Error crítico verificando user_profiles', error);
      return false;
    }
  };

  // Ejecutar todos los tests
  const runAllTests = async () => {
    setLoading(true);
    clearResults();
    
    addResult('Sistema', 'info', '🚀 INICIANDO DIAGNÓSTICO COMPLETO...');
    
    await testBasicConfig();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testConnectivity();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testUserProfiles();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (testEmail && testPassword) {
      await testAuth();
    }
    
    addResult('Sistema', 'info', '✅ Diagnóstico completado');
    setLoading(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      success: 'text-green-600 bg-green-50',
      error: 'text-red-600 bg-red-50',
      warning: 'text-yellow-600 bg-yellow-50',
      info: 'text-blue-600 bg-blue-50'
    };
    return colors[status] || 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">🔧 Supabase Debug Checker</h2>
        <p className="text-gray-600">Herramienta para diagnosticar problemas de autenticación</p>
      </div>

      {/* Formulario de test */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded">
        <Input
          label="Email de prueba"
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="usuario@example.com"
        />
        <Input
          label="Contraseña de prueba"
          type="password"
          value={testPassword}
          onChange={(e) => setTestPassword(e.target.value)}
          placeholder="contraseña"
        />
        <div className="flex items-end">
          <Button 
            onClick={runAllTests}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Ejecutando...' : 'Ejecutar Diagnóstico'}
          </Button>
        </div>
      </div>

      {/* Tests individuales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        <Button variant="outline" onClick={testBasicConfig} disabled={loading}>
          Config
        </Button>
        <Button variant="outline" onClick={testConnectivity} disabled={loading}>
          Conexión
        </Button>
        <Button variant="outline" onClick={testUserProfiles} disabled={loading}>
          Perfiles
        </Button>
        <Button variant="outline" onClick={testAuth} disabled={loading}>
          Auth
        </Button>
      </div>

      {/* Resultados */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Resultados:</h3>
          <Button variant="outline" size="sm" onClick={clearResults}>
            Limpiar
          </Button>
        </div>
        
        <div className="max-h-96 overflow-y-auto border rounded">
          {results.length === 0 ? (
            <div className="p-4 text-gray-500 text-center">
              No hay resultados. Ejecuta el diagnóstico.
            </div>
          ) : (
            results.map((result, index) => (
              <div key={index} className={`p-3 border-b ${getStatusColor(result.status)}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <span className="font-medium">[{result.test}]</span>
                    <span className="ml-2">{result.message}</span>
                  </div>
                  <span className="text-xs text-gray-500">{result.timestamp}</span>
                </div>
                {result.data && (
                  <div className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded">
                    <pre>{JSON.stringify(result.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instrucciones */}
      <div className="mt-6 p-4 bg-blue-50 rounded">
        <h4 className="font-medium text-blue-800 mb-2">📋 Instrucciones:</h4>
        <ol className="text-sm text-blue-700 space-y-1">
          <li>1. Ejecuta el diagnóstico completo primero</li>
          <li>2. Si hay errores de configuración, revisa tu archivo .env</li>
          <li>3. Si hay errores de conexión, verifica tu URL de Supabase</li>
          <li>4. Para probar autenticación, usa credenciales válidas</li>
          <li>5. Comparte los resultados si necesitas ayuda</li>
        </ol>
      </div>
    </div>
  );
};

export default SupabaseDebugChecker;
