import {
  keyDepartmentsByTestOrder,
  keySampleTypesByTestOrder,
} from "src/app/shared/helpers/sample-types.helper";

import * as moment from "moment";
import { map, flatten, keyBy, filter, uniqBy, orderBy, groupBy } from "lodash";
import {
  formatResults,
  formatUserChangedStatus,
  getAuthorizationDetailsByOrder,
  getResultsCommentsStatuses,
  mergeTestAllocations,
} from "src/app/core/helpers/lab-samples.helpers";
export interface SampleObject {
  id?: string;
  uuid?: string;
  specimenSourceName?: string;
  specimenSourceUuid?: string;
  mrNo?: string;
  patient?: any;
  orders?: any[];
  priority?: string;
  allocation?: AllocationDetailsModel;
  status?: any;
  user?: any;
  comments?: string;
}

export interface LabSampleModel {
  uuid: string;
  visit: any;
  created: number;
  dateCreated: number;
  dateTimeCreated: number;
  creator: any;
  label: string;
  orders: any[];
  patient: any;
  statuses: any[];
  voided: boolean;
}

export interface SampleIdentifier {
  specimenSourceUuid: string;
  sampleIdentifier: string;
  id: string;
}

export interface AllocationDetailsModel {
  names?: string;
  uuid?: string;
}
export class LabSample {
  constructor(
    public sample: any,
    public departments: any[],
    public specimenSources: any[],
    public codedSampleRejectionReasons: any[]
  ) {}

  get uuid(): string {
    return this.sample?.uuid;
  }

  get label(): string {
    return this.sample?.label;
  }

  get orders(): any[] {
    return map(this.sample?.orders, (order) => {
      const allocationStatuses = flatten(
        order.testAllocations.map((allocation) => {
          return allocation?.statuses;
        })
      );
      const formattedOrder = {
        ...order,
        authorizationInfo: getAuthorizationDetailsByOrder(order),
        searchingText:
          order?.order?.concept?.display?.toLowerCase() +
          " " +
          (
            this.keyedSpecimenSources[
              order?.order?.concept?.uuid
            ]?.setMembers?.map((member) => member?.display?.toLowerCase()) || []
          )?.join(" "),
        order: {
          ...order?.order,
          concept: {
            ...order?.order?.concept,
            ...this.keyedSpecimenSources[order?.order?.concept?.uuid],
            uuid: order?.order?.concept?.uuid,
            display:
              order?.order?.concept?.display?.indexOf(":") > -1
                ? order?.order?.concept?.display?.split(":")[1]
                : order?.order?.concept?.display,
            setMembers:
              this.keyedDepartments[order?.order?.concept?.uuid]?.setMembers
                ?.length == 0
                ? []
                : map(
                    this.keyedSpecimenSources[order?.order?.concept?.uuid]
                      ?.setMembers,
                    (member) => {
                      return {
                        ...member,
                        display:
                          member?.display?.indexOf(":") > -1
                            ? member?.display?.split(":")[1]
                            : member?.display,
                      };
                    }
                  ),
            keyedAnswers: keyBy(
              this.keyedSpecimenSources[order?.order?.concept?.uuid]?.answers,
              "uuid"
            ),
          },
        },
        firstSignOff: false,
        secondSignOff: false,
        collected: true,
        collectedBy: {
          display: this.sample?.creator?.display?.split(" (")[0],
          name: this.sample?.creator?.display?.split(" (")[0],
          uid: this.sample?.creator?.uuid,
        },
        accepted:
          (filter(this.sample?.statuses, { status: "ACCEPTED" }) || [])
            ?.length > 0
            ? true
            : false,
        acceptedBy: formatUserChangedStatus(
          (filter(this.sample?.statuses, {
            status: "ACCEPTED",
          }) || [])[0]
        ),
        allocationStatuses: allocationStatuses,
        testAllocations: uniqBy(
          map(mergeTestAllocations(order?.testAllocations), (allocation) => {
            const authorizationStatus = orderBy(
              allocation?.statuses?.filter(
                (status) =>
                  status?.status == "APPROVED" || status?.category == "APPROVED"
              ) || [],
              ["timestamp"],
              ["desc"]
            )[0];
            return {
              ...allocation,
              parameterUuid: allocation?.concept?.uuid,
              authorizationInfo:
                authorizationStatus?.status === "APPROVED" ||
                authorizationStatus?.category === "APPROVED"
                  ? authorizationStatus
                  : null,
              firstSignOff:
                allocation?.statuses?.length > 0 &&
                (orderBy(allocation?.statuses, ["timestamp"], ["desc"])[0]
                  ?.status == "APPROVED" ||
                  orderBy(allocation?.statuses, ["timestamp"], ["desc"])[0]
                    ?.status == "AUTHORIZED")
                  ? true
                  : false,
              secondSignOff:
                allocation?.statuses?.length > 0 &&
                orderBy(allocation?.statuses, ["timestamp"], ["desc"])[0]
                  ?.status == "APPROVED" &&
                orderBy(allocation?.statuses, ["timestamp"], ["desc"])[1]
                  ?.status == "APPROVED"
                  ? true
                  : false,
              rejected:
                allocation?.statuses?.length > 0 &&
                (orderBy(allocation?.statuses, ["timestamp"], ["desc"])[0]
                  ?.status == "REJECTED" ||
                  orderBy(allocation?.statuses, ["timestamp"], ["desc"])[0]
                    ?.category == "REJECTED")
                  ? true
                  : false,
              rejectionStatus:
                allocation?.statuses?.length > 0 &&
                orderBy(allocation?.statuses, ["timestamp"], ["desc"])[0]
                  ?.status == "REJECTED"
                  ? orderBy(allocation?.statuses, ["timestamp"], ["desc"])[0]
                  : null,
              results: formatResults(allocation?.results),
              statuses: allocation?.statuses,
              resultsCommentsStatuses: getResultsCommentsStatuses(
                allocation?.statuses
              ),
              allocationUuid: allocation?.uuid,
            };
          }),
          "parameterUuid"
        ),
        allocationsGroupedByParameterUuid: groupBy(
          map(order?.testAllocations, (allocation) => {
            const authorizationStatus = orderBy(
              allocation?.statuses,
              ["timestamp"],
              ["desc"]
            )[0];
            if (allocation?.results?.length > 0) {
              return {
                ...allocation,
                parameterUuid: allocation?.concept?.uuid,
                authorizationInfo:
                  authorizationStatus?.status === "APPROVED" ||
                  authorizationStatus?.category === "APPROVED"
                    ? authorizationStatus
                    : null,
                firstSignOff:
                  allocation?.statuses?.length > 0 &&
                  (orderBy(allocation?.statuses, ["timestamp"], ["desc"])[0]
                    ?.status == "APPROVED" ||
                    orderBy(allocation?.statuses, ["timestamp"], ["desc"])[0]
                      ?.status == "AUTHORIZED")
                    ? true
                    : false,
                secondSignOff:
                  allocation?.statuses?.length > 0 &&
                  orderBy(allocation?.statuses, ["timestamp"], ["desc"])[0]
                    ?.status == "APPROVED" &&
                  orderBy(allocation?.statuses, ["timestamp"], ["desc"])[1]
                    ?.status == "APPROVED"
                    ? true
                    : false,
                rejected:
                  allocation?.statuses?.length > 0 &&
                  (orderBy(allocation?.statuses, ["timestamp"], ["desc"])[0]
                    ?.status == "REJECTED" ||
                    orderBy(allocation?.statuses, ["timestamp"], ["desc"])[0]
                      ?.category == "REJECTED")
                    ? true
                    : false,
                rejectionStatus:
                  allocation?.statuses?.length > 0 &&
                  orderBy(allocation?.statuses, ["timestamp"], ["desc"])[0]
                    ?.status == "REJECTED"
                    ? orderBy(allocation?.statuses, ["timestamp"], ["desc"])[0]
                    : null,
                results: formatResults(allocation?.results),
                statuses: allocation?.statuses,
                resultsCommentsStatuses: getResultsCommentsStatuses(
                  allocation?.statuses
                ),
                allocationUuid: allocation?.uuid,
              };
            }
          })?.filter((alloc) => alloc),
          "parameterUuid"
        ),
      };
      return formattedOrder;
    });
  }

  get ordersWithResults(): any[] {
    return (
      this.orders?.filter(
        (order) =>
          (
            order?.testAllocations?.filter(
              (allocation) => allocation?.results?.length > 0
            ) || []
          )?.length > 0
      ) || []
    );
  }

  get statuses(): any {
    return this.sample?.statuses;
  }

  get patient(): any {
    return this.sample?.patient;
  }

  get mrn(): any {
    return this.sample?.patient?.identifiers[0]?.id;
  }

  get voided(): boolean {
    return this.sample?.voided;
  }

  get dateCreated(): Date {
    return this.sample?.dateCreated;
  }

  get creator(): any {
    return this.sample?.creator;
  }

  get keyedDepartments(): any {
    return keyDepartmentsByTestOrder(this.departments);
  }

  get keyedSpecimenSources(): any {
    return keySampleTypesByTestOrder(this.specimenSources);
  }

  get department(): any {
    console.log("Department", this.keyedDepartments[this.sample?.concept?.uid]);
    return this.keyedDepartments[this.sample?.concept?.uid];
  }

  get specimenSource(): any {
    console.log(
      "specimen Sources",
      this.keyedSpecimenSources[this.sample?.concept?.uid]
    );
    return this.keyedSpecimenSources[this.sample?.concept?.uid];
  }

  get integrationStatus(): any {
    return (this.sample?.statuses?.filter(
      (status) => status?.category === "RESULTS_INTEGRATION"
    ) || [])[0];
  }

  get releasedStatuses(): any {
    return (
      this.sample?.statuses?.filter(
        (status) => status?.status === "RELEASED"
      ) || []
    ).map((status) => {
      return {
        ...status,
        date:
          new Date(status?.timestamp).toLocaleDateString() +
          " " +
          new Date(status?.timestamp).getHours().toString() +
          ":" +
          new Date(status?.timestamp).getMinutes().toString() +
          " ( " +
          moment(Number(status?.timestamp)).fromNow() +
          " )",
      };
    });
  }
  get restrictedStatuses(): any {
    return (
      this.sample?.statuses?.filter(
        (status) => status?.status === "RESTRICTED"
      ) || []
    ).map((status) => {
      return {
        ...status,
        date:
          new Date(status?.timestamp).toLocaleDateString() +
          " " +
          new Date(status?.timestamp).getHours().toString() +
          ":" +
          new Date(status?.timestamp).getMinutes().toString() +
          " ( " +
          moment(Number(status?.timestamp)).fromNow() +
          " )",
      };
    });
  }

  get reasonsForRejection(): any[] {
    const rejectionStatuses =
      this.sample?.statuses?.filter(
        (status) => status?.category?.indexOf("REJECTED") > -1
      ) || [];
    return rejectionStatuses?.length > 0
      ? rejectionStatuses?.map((status) => {
          return {
            uuid: status?.status,
            display: (this.codedSampleRejectionReasons?.filter(
              (reason) => reason?.uuid === status?.status
            ) || [])[0]?.display,
          };
        })
      : [];
  }

  get rejected(): boolean {
    const rejectionStatuses =
      this.sample?.statuses?.filter(
        (status) => status?.category?.indexOf("REJECTED") > -1
      ) || [];
    return rejectionStatuses?.length > 0 ? true : false;
  }

  get rejectedBy(): any {
    const rejectionStatuses =
      this.sample?.statuses?.filter(
        (status) => status?.category?.indexOf("REJECTED") > -1
      ) || [];
    return rejectionStatuses?.length > 0
      ? {
          ...{
            ...rejectionStatuses[0]?.user,
            name: rejectionStatuses[0]?.user?.name?.split(" (")[0],
          },
          ...rejectionStatuses[0],
        }
      : null;
  }

  toJSon(): any {
    return {
      uuid: this.uuid,
      id: this.uuid,
      label: this.label,
      orders: this.orders,
      ordersWithResults: this.ordersWithResults,
      statuses: this.statuses,
      patient: this.patient,
      voided: this.voided,
      dateCreated: this.dateCreated,
      creator: this.creator,
      registeredBy: this.creator,
      mrn: this.mrn,
      department: this.department,
      specimen: this.specimenSource,
      collected: true,
      integrationStatus: this.integrationStatus,
      releasedStatuses: this.releasedStatuses,
      restrictedStatuses: this.restrictedStatuses,
      reasonsForRejection: this.reasonsForRejection,
    };
  }
}
