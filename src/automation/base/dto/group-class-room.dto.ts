export class Service {
    id: number;
    title: string;
}

export class User {
    id: number;
    firstName: string;
    lastName: string;
    profile: any;
    mobile: string;
}

export class GroupClassRoomDto {
    id: number;
    title?: string;
    service?: Service;
    contractor?: User;
    from?:string;
    to?:string;
    day?:number;
}