"""
Patient data model for storing and managing patient demographic information.
"""

import datetime

class PatientData:
    def __init__(self, nome="", idade=None, sexo=None, peso=None, altura=None, etnia=None, data_internacao=None, diagnostico=None):
        self.nome = nome
        self.idade = idade
        self.sexo = sexo.upper() if sexo else None  # M or F
        self.peso = peso  # kg
        self.altura = altura  # cm
        self.etnia = etnia.lower() if etnia else None  # negro, branco, asiatico, outro
        self.data_internacao = data_internacao  # datetime object
        self.diagnostico = diagnostico  # Clinical diagnosis
        
        # Sinais vitais
        self.fc = None  # Frequência cardíaca
        self.pas = None  # Pressão arterial sistólica
        self.pad = None  # Pressão arterial diastólica
        self.diurese = None  # Volume de diurese (mL)
        self.spo2 = None  # Saturação de oxigênio (%)
        self.glasgow = None  # Escala de Glasgow (3-15)
        self.tax = None  # Temperatura axilar (°C)
        self.hgt = None  # Glicemia capilar (mg/dL)
        
        # Support parameters
        self.aminas = False  # Em uso de aminas vasoativas
        self.ventilacao = False  # Em ventilação mecânica
    
    def calcular_imc(self):
        """Calculate BMI if height and weight are available"""
        if self.peso and self.altura:
            return self.peso / ((self.altura/100) ** 2)
        return None
    
    def calcular_peso_ideal(self):
        """Calculate ideal body weight based on height and sex"""
        if not self.altura or not self.sexo:
            return None
            
        if self.sexo == 'M':
            return 50 + 0.91 * (self.altura - 152.4)
        else:  # Female
            return 45.5 + 0.91 * (self.altura - 152.4)
    
    def calcular_superficie_corporal(self):
        """Calculate body surface area using Dubois formula"""
        if self.peso and self.altura:
            return 0.007184 * (self.altura ** 0.725) * (self.peso ** 0.425)
        return None
    
    def dias_internacao(self, data_atual=None):
        """Calculate days since admission"""
        if not self.data_internacao:
            return None
            
        if data_atual is None:
            data_atual = datetime.datetime.now()
            
        delta = data_atual - self.data_internacao
        return delta.days

    def __str__(self):
        """String representation of patient data"""
        info = [f"Nome: {self.nome}"]
        if self.idade:
            info.append(f"Idade: {self.idade} anos")
        if self.sexo:
            info.append(f"Sexo: {'Masculino' if self.sexo == 'M' else 'Feminino'}")
        if self.peso:
            info.append(f"Peso: {self.peso} kg")
        if self.altura:
            info.append(f"Altura: {self.altura} cm")
        if self.etnia:
            info.append(f"Etnia: {self.etnia.title()}")
            
        # Adicionar sinais vitais se disponíveis
        vitals = []
        if self.fc:
            vitals.append(f"FC: {self.fc} bpm")
        if self.pas and self.pad:
            vitals.append(f"PA: {self.pas}/{self.pad} mmHg")
        if self.spo2:
            vitals.append(f"SpO2: {self.spo2}%")
        if self.tax:
            vitals.append(f"Tax: {self.tax}°C")
        if self.glasgow:
            vitals.append(f"Glasgow: {self.glasgow}")
        if self.diurese:
            vitals.append(f"Diurese: {self.diurese} mL")
        if self.hgt:
            vitals.append(f"HGT: {self.hgt} mg/dL")
            
        if vitals:
            info.append("\nSinais Vitais:")
            info.extend(vitals)
            
        return "\n".join(info) 