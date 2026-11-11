import { RobleClient } from "@/src/core/roble/RobleClient";
import { QUERIES } from "@/src/core/roble/tables";
import { TrustDataSource } from "./TrustDataSource";

// Habla con Roble por las consultas guardadas (`roble_queries/`). No decide
// nada y deja subir las excepciones.
export class TrustRemoteDataSource implements TrustDataSource {
  constructor(private readonly client: RobleClient) {}

  async readParticipations(userIds: string[]) {
    const result = await this.client.db.executeQueryByName(QUERIES.commitmentByProject, [userIds.join(",")]);
    return result.rows;
  }

  async readDeliveries(userIds: string[]) {
    const result = await this.client.db.executeQueryByName(QUERIES.onTimeDeliveries, [userIds.join(",")]);
    return result.rows;
  }
}
