"use client";

import React from "react";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  User,
  CreditCard,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSearchParams } from "next/navigation";
import { JwtTokenService } from "@/token-jwt.service";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

interface UserData {
  username: string;
  requiredAmount: number;
}

interface CartonPurchase {
  userId: string;
  username: string;
  numeroCarton: number;
  sorteo: number;
  fechaSorteo: string;
  monto: number;
  referenciaVenta: string;
  nombreArchivoPdf: string;
}

const BingoMain = () => {
  const [apiUrl, setApiUrl] = useState(
    "http://localhost:3000/api/bingo-integration"
  );
  const [secretKey, setSecretKey] = useState(
    process.env.NEXT_PUBLIC_BINGO_SECRET_SSO_SECRET_KEY || ""
  );

  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  // Get JWT token from URL params if available
  const searchParams = useSearchParams();

  // User validation state
  const [userData, setUserData] = useState<UserData>({
    username: "",
    requiredAmount: 0,
  });

  useEffect(() => {
    const jwtTOken = searchParams.get("token") || "";
    if (jwtTOken) {
      const jwtService = new JwtTokenService();

      const isValid = jwtService.verifyToken(
        jwtTOken,
        process.env.NEXT_PUBLIC_BINGO_SECRET_JWT || "",
        {
          algorithms: ["HS512"],
        }
      );
      const decoded = jwtService.decodeToken(jwtTOken);
      setUserData((prev) => ({
        ...prev,
        username: typeof decoded === "object" && decoded?.username,
      }));
    }
  }, [searchParams, secretKey]);
  const [validationResult, setValidationResult] = useState<ApiResponse | null>(
    null
  );

  // Purchase state
  const [purchaseData, setPurchaseData] = useState<CartonPurchase>({
    userId: "",
    username: "",
    numeroCarton: 0,
    sorteo: 0,
    fechaSorteo: "",
    monto: 0,
    referenciaVenta: "",
    nombreArchivoPdf: "",
  });
  const [purchaseResult, setPurchaseResult] = useState<ApiResponse | null>(
    null
  );

  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  //   const testConnection = async () => {
  //     setLoading(true);
  //     addLog("Probando conexión con el servidor...");
  //     const jwtTOken = searchParams.get("token") || "";
  //     const jwtService = new JwtTokenService();
  //     if (jwtTOken) {
  //       const isValid = jwtService.verifyToken(jwtTOken, secretKey);
  //       addLog(isValid ? "✅ JWT válido proporcionado" : "❌ JWT inválido");
  //     } else {
  //       addLog("⚠️ No se proporcionó JWT en los parámetros de la URL");
  //     }

  //     addLog(`URL ${apiUrl}/login`);
  //     try {
  //       const response = await fetch(`${apiUrl}/login`, {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${jwtTOken}`,
  //         },
  //         body: JSON.stringify({
  //           userId: userData.username || "test_user",
  //         }),
  //       });

  //       if (response.ok) {
  //         setIsConnected(true);
  //         addLog("✅ Conexión exitosa con el servidor");
  //       } else {
  //         setIsConnected(false);
  //         addLog("❌ Error de conexión: " + response.statusText);
  //       }
  //     } catch (error) {
  //       setIsConnected(false);
  //       addLog("❌ Error de conexión: " + (error as Error).message);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  const validateUser = async () => {
    if (!userData.username || !userData.requiredAmount) {
      addLog("❌ Faltan datos del usuario");
      return;
    }

    setLoading(true);
    addLog(`Validando usuario: ${userData.username}`);

    try {
      const response = await fetch(`${apiUrl}/validate-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SSO-Secret": secretKey,
        },
        body: JSON.stringify({
          username: userData.username,
          requiredAmount: userData.requiredAmount,
        }),
      });

      const result = await response.json();
      const apiResponse: ApiResponse = {
        success: response.ok,
        data: result,
        error: response.ok ? undefined : result.error || "Error desconocido",
        timestamp: new Date().toISOString(),
      };

      setValidationResult(apiResponse);

      if (response.ok) {
        addLog(`✅ Usuario validado correctamente: ${userData.username}`);
        // Auto-fill purchase data if validation is successful
        setPurchaseData((prev) => ({
          ...prev,
          username: userData.username,
          userId: result.userId || "user_" + Date.now(),
        }));

        setIsConnected(true);
      } else {
        addLog(`❌ Error validando usuario: ${apiResponse.error}`);
      }
    } catch (error) {
      const errorMsg = (error as Error).message;
      setValidationResult({
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });
      addLog(`❌ Error de red: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const purchaseCarton = async () => {
    if (
      !purchaseData.username ||
      !purchaseData.numeroCarton ||
      !purchaseData.monto
    ) {
      addLog("❌ Faltan datos para la compra");
      return;
    }

    setLoading(true);
    addLog(
      `Comprando cartón ${purchaseData.numeroCarton} para ${purchaseData.username}`
    );

    try {
      const purchasePayload = {
        ...purchaseData,

        //YYYYMMDD
        fechaSorteo: purchaseData.fechaSorteo
          ? purchaseData.fechaSorteo.replace(/-/g, "")
          : "",
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(`${apiUrl}/purchase-cardboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SSO-Secret": secretKey,
        },
        body: JSON.stringify(purchasePayload),
      });

      const result = await response.json();
      const apiResponse: ApiResponse = {
        success: response.ok,
        data: result,
        error: response.ok ? undefined : result.error || "Error desconocido",
        timestamp: new Date().toISOString(),
      };

      setPurchaseResult(apiResponse);

      if (response.ok) {
        addLog(
          `✅ Cartón comprado exitosamente: #${purchaseData.numeroCarton}`
        );
      } else {
        addLog(`❌ Error comprando cartón: ${apiResponse.error}`);
      }
    } catch (error) {
      const errorMsg = (error as Error).message;
      setPurchaseResult({
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });
      addLog(`❌ Error de red: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomPurchase = () => {
    const randomCarton = Math.floor(Math.random() * 10000) + 1;
    const randomSorteo = Math.floor(Math.random() * 100) + 1;
    const randomMonto = Math.floor(Math.random() * 50000) + 5000;
    const today = new Date();
    const futureDate = new Date(
      today.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000
    );

    setPurchaseData((prev) => ({
      ...prev,
      numeroCarton: randomCarton,
      sorteo: randomSorteo,
      fechaSorteo: futureDate.toISOString().split("T")[0],
      monto: randomMonto,
      referenciaVenta: `REF${Date.now()}`,
      nombreArchivoPdf: `carton_${randomCarton}_${Date.now()}.pdf`,
    }));

    addLog(
      `🎲 Datos aleatorios generados: Cartón #${randomCarton}, Sorteo #${randomSorteo}`
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">
            Simulador de Bingo Externo
          </h1>
          <p className="text-lg text-gray-600">
            Interfaz de prueba para interactuar con APIs de bingo
          </p>
        </div>

        {/* Connection Configuration */}
        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Configuración de Conexión
            </CardTitle>
            <CardDescription>
              Configura la conexión con tu servidor local
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="apiUrl">URL del Servidor</Label>
                <Input
                  id="apiUrl"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="http://localhost:3000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secretKey">Clave Secreta (X-SSO-Secret)</Label>
                <Input
                  id="secretKey"
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="BINGO_SECRET_SSO_SECRET_KEY"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={testConnection} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Probar Conexión"
                )}
              </Button>
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Conectado" : "Desconectado"}
              </Badge>
            </div>
          </CardContent>
        </Card> */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Validation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Validación de Usuario
              </CardTitle>
              <CardDescription>
                Valida si un usuario puede realizar compras
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nombre de Usuario</Label>
                <Input
                  id="username"
                  value={userData.username}
                  onChange={(e) =>
                    setUserData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  placeholder="usuario123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requiredAmount">Monto Requerido</Label>
                <Input
                  id="requiredAmount"
                  type="number"
                  value={userData.requiredAmount}
                  onChange={(e) =>
                    setUserData((prev) => ({
                      ...prev,
                      requiredAmount: Number(e.target.value),
                    }))
                  }
                  placeholder="10000"
                />
              </div>
              <Button
                onClick={validateUser}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Validar Usuario"
                )}
              </Button>

              {validationResult && (
                <Alert
                  className={
                    validationResult.success
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }
                >
                  {validationResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription>
                    {validationResult.success
                      ? "Usuario validado correctamente"
                      : validationResult.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Purchase Carton */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Compra de Cartón
              </CardTitle>
              <CardDescription>
                Simula la compra de un cartón de bingo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchaseUsername">Usuario</Label>
                  <Input
                    id="purchaseUsername"
                    value={purchaseData.username}
                    onChange={(e) =>
                      setPurchaseData((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    placeholder="usuario123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userId">ID Usuario</Label>
                  <Input
                    id="userId"
                    value={purchaseData.userId}
                    onChange={(e) =>
                      setPurchaseData((prev) => ({
                        ...prev,
                        userId: e.target.value,
                      }))
                    }
                    placeholder="user_123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numeroCarton">Número de Cartón</Label>
                  <Input
                    id="numeroCarton"
                    type="number"
                    value={purchaseData.numeroCarton}
                    onChange={(e) =>
                      setPurchaseData((prev) => ({
                        ...prev,
                        numeroCarton: Number(e.target.value),
                      }))
                    }
                    placeholder="1234"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sorteo">Sorteo</Label>
                  <Input
                    id="sorteo"
                    type="number"
                    value={purchaseData.sorteo}
                    onChange={(e) =>
                      setPurchaseData((prev) => ({
                        ...prev,
                        sorteo: Number(e.target.value),
                      }))
                    }
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fechaSorteo">Fecha Sorteo</Label>
                  <Input
                    id="fechaSorteo"
                    type="date"
                    value={purchaseData.fechaSorteo}
                    onChange={(e) =>
                      setPurchaseData((prev) => ({
                        ...prev,
                        fechaSorteo: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monto">Monto</Label>
                  <Input
                    id="monto"
                    type="number"
                    value={purchaseData.monto}
                    onChange={(e) =>
                      setPurchaseData((prev) => ({
                        ...prev,
                        monto: Number(e.target.value),
                      }))
                    }
                    placeholder="15000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="referenciaVenta">Referencia Venta</Label>
                  <Input
                    id="referenciaVenta"
                    value={purchaseData.referenciaVenta}
                    onChange={(e) =>
                      setPurchaseData((prev) => ({
                        ...prev,
                        referenciaVenta: e.target.value,
                      }))
                    }
                    placeholder="REF123456"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombreArchivoPdf">Archivo PDF</Label>
                  <Input
                    id="nombreArchivoPdf"
                    value={purchaseData.nombreArchivoPdf}
                    onChange={(e) =>
                      setPurchaseData((prev) => ({
                        ...prev,
                        nombreArchivoPdf: e.target.value,
                      }))
                    }
                    placeholder="carton_1234.pdf"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={generateRandomPurchase}
                  variant="outline"
                  className="flex-1 bg-transparent"
                >
                  🎲 Generar Datos
                </Button>
                <Button
                  onClick={purchaseCarton}
                  disabled={loading || !isConnected}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Comprar Cartón"
                  )}
                </Button>
              </div>

              {purchaseResult && (
                <Alert
                  className={
                    purchaseResult.success
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }
                >
                  {purchaseResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription>
                    {purchaseResult.success
                      ? "Cartón comprado exitosamente"
                      : purchaseResult.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Registro de Actividad</CardTitle>
            <CardDescription>
              Historial de operaciones y respuestas del servidor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">
                  No hay actividad registrada...
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
            <Button
              onClick={() => setLogs([])}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Limpiar Logs
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BingoMain;
