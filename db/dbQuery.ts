import { query } from "./index.js";

export type ContinueWatchingData = Record<number, { title: string; id: string }>;
export type StreamingServiceRow = { id: number, service: string};
export type SessionState = { cookies: any; origins: { origin: string; localStorage: Array<{ name: string; value: string; }>; }[]; };
export type StreamingAccount = { email: string, password: string }

const ENCRYPTION_KEY = process.env.PG_ENCRYPTION_KEY;

export async function insertStreamingServiceData(service: string, formattedData: ContinueWatchingData) {
    const { rows } = await query(`
      SELECT id FROM streaming_service WHERE name = $1
    `, [service]);

    if (rows.length > 0) {
      // @ts-ignore
      const serviceId = rows[0].id;

      // Insert or update the data in streaming_service_data
      await query(`
        INSERT INTO streaming_service_data (streaming_service_id, data_type, json_data)
        VALUES ($1, $2, $3)
        ON CONFLICT (streaming_service_id, data_type)
        DO UPDATE SET json_data = $3, updated_at = now()
      `, [serviceId, 'resume', JSON.stringify(formattedData)]);
    }
}

export async function selectStreamingService(service: string): Promise<StreamingServiceRow> {
    const { rows } = await query(`
    SELECT * FROM streaming_service WHERE name = $1
  `, [service]);

  if (rows.length === 0) {
    throw new Error(`Streaming service '${service}' does not exist in streaming_service table`);
  }
  return rows[0];
}

export async function insertSessionState(serviceId: number, state: SessionState, expiresEpoch: number) {
  await query(`
    INSERT INTO session_states (streaming_service_id, json_state, expires)
    VALUES ($1, $2, to_timestamp($3))
    ON CONFLICT (streaming_service_id) DO UPDATE
      SET json_state = $2, expires = to_timestamp($3), updated_at = now()
  `, [serviceId, state, expiresEpoch]);
}

export async function selectSessionState(service: string): Promise<SessionState> {
  const { rows } = await query(`
    SELECT ss.json_state
    FROM session_states ss
    JOIN streaming_service s ON ss.streaming_service_id = s.id
    WHERE s.name = $1
  `, [service]);
  // @ts-ignore
  return rows[0]?.json_state || null;
}

export async function insertStreamingAccount(serviceId: number, email: string, password: string) {
  await query(`
    INSERT INTO streaming_accounts (streaming_service_id, email, encrypted_password)
    VALUES ($1, $2, pgp_sym_encrypt($3, $4))
    ON CONFLICT (streaming_service_id)
      DO UPDATE SET
        email = $2,
        encrypted_password = pgp_sym_encrypt($3, $4)
  `, [serviceId, email, password, ENCRYPTION_KEY]);
}

export async function selectStreamingAccount(service: string): Promise<StreamingAccount> {
  const { rows } = await query(`
    SELECT
      sa.email,
      pgp_sym_decrypt(sa.encrypted_password, $1) AS password
    FROM streaming_accounts sa
    JOIN streaming_service s ON sa.streaming_service_id = s.id
    WHERE s.name = $2
  `, [ENCRYPTION_KEY, service]);
  return rows[0] || null;
}

export async function selectResumeData(service?: string) {
  let sqlQuery = `
    SELECT
      s.name as service,
      ssd.json_data as data
    FROM streaming_service_data ssd
    JOIN streaming_service s ON ssd.streaming_service_id = s.id
    WHERE ssd.data_type = $1
  `;

  const params = ['resume'];

  if (service) {
    sqlQuery += ` AND s.name = $2`;
    params.push(service);
  }

  sqlQuery += ` ORDER BY s.name`;

  const { rows } = await query(sqlQuery, params);

  if (service) {
    // Return single service data
    return rows[0] ? { service: rows[0].service, data: rows[0].data } : null;
  }

  // Return all services data as object keyed by service name
  const result = {};
  rows.forEach(row => {
    result[row.service] = row.data;
  });
  return result;
}

export async function selectServiceStatuses() {
  const { rows } = await query(`
    SELECT
      s.name as service,
      CASE WHEN sa.id IS NOT NULL THEN true ELSE false END as has_credentials,
      CASE WHEN ss.id IS NOT NULL THEN true ELSE false END as has_session_state,
      ssd.updated_at as last_scrape
    FROM streaming_service s
    LEFT JOIN streaming_accounts sa ON sa.streaming_service_id = s.id
    LEFT JOIN session_states ss ON ss.streaming_service_id = s.id
    LEFT JOIN streaming_service_data ssd ON ssd.streaming_service_id = s.id AND ssd.data_type = 'resume'
    ORDER BY s.name
  `, []);

  return rows;
}