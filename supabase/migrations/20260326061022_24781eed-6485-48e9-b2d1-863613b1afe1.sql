-- Re-classify old discoveries that were incorrectly categorized by agent class mapping
-- Use keyword matching to fix domain assignments

-- governance/treaty/framework → policy
UPDATE discoveries SET domain = 'policy'
WHERE (title ILIKE '%governance%' OR title ILIKE '%treaty%' OR title ILIKE '%framework%' OR title ILIKE '%diplomacy%' OR title ILIKE '%peace%' OR title ILIKE '%regulation%')
AND domain NOT IN ('policy');

-- communication/cultural → ai  
UPDATE discoveries SET domain = 'ai'
WHERE (title ILIKE '%communication protocol%' OR title ILIKE '%neural%' OR title ILIKE '%machine learning%' OR title ILIKE '%algorithm%')
AND domain NOT IN ('ai');

-- supply chain/trade/market → economics
UPDATE discoveries SET domain = 'economics'
WHERE (title ILIKE '%supply chain%' OR title ILIKE '%trade%' OR title ILIKE '%market%' OR title ILIKE '%economic%' OR title ILIKE '%financial%' OR title ILIKE '%currency%' OR title ILIKE '%inflation%')
AND domain NOT IN ('economics');

-- drug/therapy/disease/cancer/patient → medicine
UPDATE discoveries SET domain = 'medicine'
WHERE (title ILIKE '%drug%' OR title ILIKE '%therapy%' OR title ILIKE '%disease%' OR title ILIKE '%cancer%' OR title ILIKE '%patient%' OR title ILIKE '%diagnostic%' OR title ILIKE '%clinical%')
AND domain NOT IN ('medicine');

-- protein/gene/dna/crispr → biotech
UPDATE discoveries SET domain = 'biotech'
WHERE (title ILIKE '%protein%' OR title ILIKE '%gene %' OR title ILIKE '%genetic%' OR title ILIKE '%dna%' OR title ILIKE '%crispr%' OR title ILIKE '%biomarker%' OR title ILIKE '%organoid%')
AND domain NOT IN ('biotech');

-- quantum/particle/photon → physics
UPDATE discoveries SET domain = 'physics'
WHERE (title ILIKE '%quantum%' OR title ILIKE '%particle%' OR title ILIKE '%photon%' OR title ILIKE '%entanglement%' OR title ILIKE '%qubit%')
AND domain NOT IN ('physics');

-- gravitational/orbit/satellite/mars/telescope → space
UPDATE discoveries SET domain = 'space'
WHERE (title ILIKE '%gravitational%' OR title ILIKE '%orbit%' OR title ILIKE '%satellite%' OR title ILIKE '%mars%' OR title ILIKE '%telescope%' OR title ILIKE '%asteroid%' OR title ILIKE '%galaxy%' OR title ILIKE '%cosmic%')
AND domain NOT IN ('space');

-- hydrogen/solar/battery/renewable/fusion → energy
UPDATE discoveries SET domain = 'energy'
WHERE (title ILIKE '%hydrogen%' OR title ILIKE '%solar%' OR title ILIKE '%battery%' OR title ILIKE '%renewable%' OR title ILIKE '%fusion%' OR title ILIKE '%energy%' OR title ILIKE '%grid%')
AND domain NOT IN ('energy');

-- climate/carbon/emission/warming → climate
UPDATE discoveries SET domain = 'climate'
WHERE (title ILIKE '%climate%' OR title ILIKE '%carbon%' OR title ILIKE '%emission%' OR title ILIKE '%warming%' OR title ILIKE '%pollution%' OR title ILIKE '%sustainability%' OR title ILIKE '%ecosystem%')
AND domain NOT IN ('climate');

-- graphene/polymer/nanomaterial → materials
UPDATE discoveries SET domain = 'materials'
WHERE (title ILIKE '%graphene%' OR title ILIKE '%polymer%' OR title ILIKE '%nanomaterial%' OR title ILIKE '%alloy%' OR title ILIKE '%semiconductor%' OR title ILIKE '%metamaterial%')
AND domain NOT IN ('materials');